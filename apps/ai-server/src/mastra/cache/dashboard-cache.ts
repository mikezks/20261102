import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { type DashboardSpec, dashboardSpecSchema } from '../dashboard-dsl/dashboard-spec.js';

// The CLI runs the built server from .mastra/output. Keep cache data next
// to that runtime, independent of source-file paths changed by bundling.
const CACHE_DIR = resolve(process.env['AI_CACHE_DIR'] || 'cache');
const FILE_SUFFIX = '.dashboard.json';

interface RequestMessage {
  readonly role: string;
  readonly content?: unknown;
}

export interface DashboardCacheEntry {
  spec: DashboardSpec;
}

export function computeDashboardRequestHash(messages: readonly RequestMessage[]): string {
  const userTexts = messages
    .filter((message) => message.role === 'user')
    .map((message) => extractText(message.content))
    .filter((text) => text.length > 0);

  return createHash('sha256').update(userTexts.join('\n---\n')).digest('hex');
}

export async function dashboardCacheExists(hash: string): Promise<boolean> {
  try {
    await access(getCacheFilePath(hash));
    return true;
  } catch (err) {
    if (isNotFoundError(err)) {
      return false;
    }
    throw err;
  }
}

export async function readDashboardCache(hash: string): Promise<DashboardCacheEntry | null> {
  try {
    const raw = await readFile(getCacheFilePath(hash), 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return toCacheEntry(parsed);
  } catch (err) {
    if (isNotFoundError(err)) {
      return null;
    }
    throw err;
  }
}

export async function writeDashboardCache(
  hash: string,
  spec: DashboardSpec,
): Promise<DashboardCacheEntry> {
  const entry: DashboardCacheEntry = { spec };
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(getCacheFilePath(hash), JSON.stringify(entry, null, 2), 'utf-8');
  return entry;
}

function toCacheEntry(value: unknown): DashboardCacheEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as { spec?: unknown };
  if (!candidate.spec) {
    return null;
  }
  const result = dashboardSpecSchema.safeParse(candidate.spec);
  if (!result.success) {
    return null;
  }
  return { spec: result.data };
}

function getCacheFilePath(hash: string): string {
  return join(CACHE_DIR, `${hash}${FILE_SUFFIX}`);
}

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
