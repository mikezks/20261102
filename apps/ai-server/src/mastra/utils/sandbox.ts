import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSDeferredPromise,
} from 'quickjs-emscripten';

export type HostFunctions = Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
export interface SandboxOptions {
  functions?: HostFunctions;
  memoryLimitBytes?: number;
  stackLimitBytes?: number;
  timeoutMs?: number;
  hardTimeoutMs?: number;
}
export class SandboxTimeoutError extends Error {
  constructor(ms: number) {
    super(`Sandbox exceeded timeout of ${ms} ms.`);
    this.name = 'SandboxTimeoutError';
  }
}
function toGuest(context: QuickJSContext, value: unknown): QuickJSHandle {
  if (value === undefined) return context.undefined;
  return context.unwrapResult(context.evalCode(`(${JSON.stringify(value)})`));
}

/** Only explicitly supplied functions cross the VM boundary. No Node or browser globals. */
export async function runSandbox(code: string, options: SandboxOptions = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const hardTimeoutMs = options.hardTimeoutMs ?? 45_000;
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(options.memoryLimitBytes ?? 64 * 1024 * 1024);
  runtime.setMaxStackSize(options.stackLimitBytes ?? 1024 * 1024);
  runtime.setModuleLoader((name) => ({ error: new Error(`Import is not allowed: ${name}`) }));
  const deadline = Date.now() + timeoutMs;
  runtime.setInterruptHandler(() => Date.now() >= deadline);
  const context = runtime.newContext();
  const pending = new Set<QuickJSDeferredPromise>();
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let evaluation: QuickJSHandle | undefined;
  let rejectHost: (error: unknown) => void = () => undefined;
  const hostFailure = new Promise<never>((_, reject) => {
    rejectHost = reject;
  });
  const drainJobs = () => {
    const result = runtime.executePendingJobs();
    if (result.error) {
      const error = context.dump(result.error);
      result.error.dispose();
      rejectHost(
        new Error(typeof error?.message === 'string' ? error.message : 'Sandbox job failed.'),
      );
    }
  };
  try {
    for (const [name, fn] of Object.entries(options.functions ?? {})) {
      const handle = context.newFunction(name, (...args) => {
        let result: unknown;
        try {
          result = fn(...args.map((arg) => context.dump(arg)));
        } catch (error) {
          return {
            error: context.newError(error instanceof Error ? error.message : String(error)),
          };
        }
        if (!(result instanceof Promise)) return toGuest(context, result);
        const deferred = context.newPromise();
        pending.add(deferred);
        const settle = (value: unknown, failed: boolean) => {
          if (!alive) return;
          try {
            const valueHandle = failed
              ? context.newError(value instanceof Error ? value.message : String(value))
              : toGuest(context, value);
            if (failed) deferred.reject(valueHandle);
            else deferred.resolve(valueHandle);
            valueHandle.dispose();
            pending.delete(deferred);
            deferred.dispose();
            drainJobs();
          } catch (error) {
            rejectHost(error);
          }
        };
        void result.then(
          (value) => settle(value, false),
          (error) => settle(error, true),
        );
        return deferred.handle;
      });
      context.setProp(context.global, name, handle);
      handle.dispose();
    }
    evaluation = context.unwrapResult(context.evalCode(code, 'sandbox.mjs', { type: 'module' }));
    drainJobs();
    const complete = context.resolvePromise(evaluation).then((result) => {
      if (alive) context.unwrapResult(result).dispose();
    });
    // Attaching the settlement callback enqueues another guest job even when
    // the module completed synchronously. Drain it before waiting in Node.
    drainJobs();
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SandboxTimeoutError(hardTimeoutMs)), hardTimeoutMs);
    });
    await Promise.race([complete, timeout, hostFailure]);
  } finally {
    alive = false;
    clearTimeout(timer);
    for (const deferred of pending) deferred.dispose();
    pending.clear();
    evaluation?.dispose();
    context.dispose();
    runtime.dispose();
  }
}
