type GlobalScope = Record<string, unknown>;

export function withTemporaryGlobals<T>(globals: Record<string, unknown>, run: () => T): T {
  const scope = globalThis as unknown as GlobalScope;
  const prev: Record<string, { had: boolean; value: unknown }> = {};

  for (const [key, value] of Object.entries(globals)) {
    prev[key] = { had: Object.prototype.hasOwnProperty.call(scope, key), value: scope[key] };
    scope[key] = value;
  }

  try {
    return run();
  } finally {
    for (const [key, info] of Object.entries(prev)) {
      if (!info.had) delete scope[key];
      else scope[key] = info.value;
    }
  }
}

