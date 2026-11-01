import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const runNpm = (args, stdio = 'pipe') =>
  spawnSync(npm, args, {
    cwd: root,
    stdio,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, npm_config_update_notifier: 'false' },
  });

async function verifySkills() {
  const base = '.agents/skills';
  const lock = await readJson(`${base}/angular-skills.lock.json`);
  for (const [path, expected] of Object.entries(lock.files)) {
    const actual = sha256(await readFile(join(root, base, path)));
    if (actual !== expected)
      throw new Error(`Modified skill file: ${base}/${path}. Left unchanged.`);
  }
  for (const skill of lock.skills) {
    const entries = await readdir(join(root, base, skill), {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries.filter((item) => item.isFile())) {
      const path = join(entry.parentPath, entry.name)
        .slice(join(root, base).length + 1)
        .replaceAll('\\', '/');
      if (!lock.files[path]) throw new Error(`Unpinned skill file: ${path}. Left unchanged.`);
    }
  }
  return { commit: lock.commit, filesVerified: Object.keys(lock.files).length };
}

async function installationValid(lock) {
  try {
    const installedLock = await readJson('node_modules/.package-lock.json');
    for (const [path, installed] of Object.entries(installedLock.packages)) {
      const pinned = lock.packages[path];
      if (
        !pinned ||
        installed.version !== pinned.version ||
        installed.integrity !== pinned.integrity
      )
        return false;
    }
    // npm checks missing/invalid transitive dependencies, including platform-specific optionals.
    if (runNpm(['ls', '--all', '--json']).status !== 0) return false;
    for (const name of ['@angular/core', '@angular/cli', '@modelcontextprotocol/sdk']) {
      const installed = await readJson(`node_modules/${name}/package.json`);
      if (installed.version !== lock.packages[`node_modules/${name}`].version) return false;
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function main() {
  const skills = await verifySkills(); // Never repair or overwrite modified vendored instructions.
  const pkg = await readJson('package.json');
  const lock = await readJson('package-lock.json');
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const ordered = (value) => JSON.stringify(Object.entries(value ?? {}).sort());
    if (ordered(pkg[field]) !== ordered(lock.packages[''][field])) {
      throw new Error(
        `${field} differ between package.json and the lockfile; resolve deliberately first.`,
      );
    }
  }
  const pinnedNode = (await readFile(join(root, '.nvmrc'), 'utf8')).trim();
  if (process.versions.node !== pinnedNode) {
    throw new Error(`Use Node ${pinnedNode} from .nvmrc (current: ${process.versions.node}).`);
  }
  const npmVersion = runNpm(['--version']);
  if (npmVersion.status !== 0 || `npm@${npmVersion.stdout.trim()}` !== pkg.packageManager) {
    throw new Error(
      `Use ${pkg.packageManager} (current: ${npmVersion.stdout?.trim() ?? 'unavailable'}).`,
    );
  }
  const manifests = ['package.json', 'package-lock.json'];
  const before = await Promise.all(manifests.map((path) => readFile(join(root, path))));
  let installation = 'reused';
  if (!(await installationValid(lock))) {
    console.log('Installing missing or invalid dependencies from the existing lockfile.');
    const result = runNpm(['ci', '--no-audit', '--no-fund'], 'inherit');
    if (result.status !== 0)
      throw new Error('Lockfile installation failed; no dependency versions were updated.');
    installation = 'installed from lockfile';
    if (!(await installationValid(lock)))
      throw new Error('Installed dependency tree does not match the lockfile.');
  }
  for (let index = 0; index < manifests.length; index++) {
    if (!before[index].equals(await readFile(join(root, manifests[index])))) {
      throw new Error(`${manifests[index]} changed during setup; inspect it before continuing.`);
    }
  }
  // Import only after installation, so this command also works in an empty checkout.
  const { connectAngular } = await import('./mcp.mjs');
  const session = await connectAngular();
  try {
    const projects = await session.call('list_projects');
    const workspace = projects.structuredContent?.workspaces.find(
      (item) => dirname(item.path) === root.slice(0, -1),
    );
    if (!workspace) throw new Error('MCP did not discover this Angular workspace.');
    const practices = await session.call('get_best_practices', { workspacePath: workspace.path });
    if (!practices.content.some((item) => item.type === 'text' && item.text.length > 0)) {
      throw new Error('MCP returned no best practices.');
    }
    console.log(
      JSON.stringify(
        {
          node: process.versions.node,
          npm: npmVersion.stdout.trim(),
          angular: lock.packages['node_modules/@angular/core'].version,
          cli: session.server,
          skills,
          installation,
          connection: 'script-based stdio MCP',
          tools: session.tools.map((tool) => tool.name),
          projects: workspace.projects.length,
          calls: ['initialize', 'tools/list', 'list_projects', 'get_best_practices'],
        },
        null,
        2,
      ),
    );
  } finally {
    await session.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
