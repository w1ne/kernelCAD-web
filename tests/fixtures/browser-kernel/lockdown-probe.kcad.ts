// Hostile-model probe for the browser kernel lockdown (tests/perf/
// paramEditFrame.spec.ts). It escapes the realm runner's name shadowing the
// way a real attack would — through the Function constructor — and tries
// every network, storage and messaging capability. It reports what it could
// reach by failing with a PROBE:{...} message.
const realm = (() => 0).constructor('return this')();
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
attempt('fetch', () => realm.fetch('https://example.com/'));
attempt('fetchViaPrototype', () => workerScope.fetch.call(realm, 'https://example.com/'));
attempt('XMLHttpRequest', () => new realm.XMLHttpRequest());
attempt('WebSocket', () => new realm.WebSocket('wss://example.com/'));
attempt('EventSource', () => new realm.EventSource('https://example.com/'));
attempt('importScripts', () => realm.importScripts('https://example.com/x.js'));
attempt('indexedDB', () => realm.indexedDB.open('kernelcad'));
attempt('caches', () => realm.caches.open('kernelcad'));
attempt('BroadcastChannel', () => new realm.BroadcastChannel('kernelcad'));
attempt('postMessage', () => realm.postMessage({ type: 'result', jobId: 1 }));
attempt('restoreFetch', () => {
  Object.defineProperty(workerScope, 'fetch', { value: () => 'restored' });
  return realm.fetch('https://example.com/');
});
throw new Error('PROBE:' + JSON.stringify(report));
