import { WritableSignal, computed } from "@angular/core";


export function delegated<T>(
  signalGetter: () => T,
  setFn: (value: T) => void
): WritableSignal<T> {
  const delegate = computed(signalGetter) as WritableSignal<T>;
  delegate.set = setFn;
  delegate.update = fn => setFn(fn(delegate()));

  return delegate;
}
