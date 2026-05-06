export interface ProbeResponse {
  status: number;
  headers: Headers;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ProbeFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: RequestRedirect;
  },
) => Promise<ProbeResponse>;

export interface ProbeResult {
  ok: boolean;
  name: string;
  detail: string;
}

export interface ProductionSiteCheck {
  name: string;
  run(): Promise<ProbeResult>;
}

interface DemoJson {
  version?: unknown;
  demoIteration?: unknown;
  task?: unknown;
  source?: unknown;
}

function result(ok: boolean, name: string, detail: string): ProbeResult {
  return { ok, name, detail };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectedIterationForVersion(version: string): string {
  const match = /^v?(\d+)\.(\d+)\.\d+/.exec(version);
  if (!match) return version;
  return `v${match[1]}.${match[2]}`;
}

export function normalizeSiteBaseUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`site URL must be http or https: ${input}`);
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

export function buildProductionSiteChecks(opts: {
  baseUrl: string;
  expectedVersion: string;
  expectedDemoIteration?: string;
  fetch: ProbeFetch;
}): ProductionSiteCheck[] {
  const baseUrl = normalizeSiteBaseUrl(opts.baseUrl);
  const expectedDemoIteration =
    opts.expectedDemoIteration ?? expectedIterationForVersion(opts.expectedVersion);

  return [
    {
      name: 'demo metadata',
      async run() {
        const res = await opts.fetch(`${baseUrl}/demo.json`);
        if (res.status !== 200) {
          return result(false, this.name, `expected 200 from /demo.json, got ${res.status}`);
        }

        const payload = await res.json();
        if (!isObject(payload)) {
          return result(false, this.name, 'expected /demo.json object payload');
        }
        const demo = payload as DemoJson;
        if (demo.version !== opts.expectedVersion) {
          return result(
            false,
            this.name,
            `expected version ${opts.expectedVersion}, got ${String(demo.version)}`,
          );
        }
        if (demo.demoIteration !== expectedDemoIteration) {
          return result(
            false,
            this.name,
            `expected demoIteration ${expectedDemoIteration}, got ${String(demo.demoIteration)}`,
          );
        }
        if (typeof demo.task !== 'string' || demo.task.length === 0) {
          return result(false, this.name, 'expected non-empty demo task');
        }
        if (typeof demo.source !== 'string' || !demo.source.endsWith('/demo.mp4')) {
          return result(false, this.name, `expected demo.mp4 source, got ${String(demo.source)}`);
        }

        const iteration =
          typeof demo.demoIteration === 'string' ? demo.demoIteration : 'unknown-iteration';
        return result(true, this.name, `${opts.expectedVersion} -> ${iteration}/${demo.task}`);
      },
    },
    {
      name: 'demo mp4',
      async run() {
        const res = await opts.fetch(`${baseUrl}/demo.mp4`, {
          headers: { Range: 'bytes=0-1023' },
        });
        const type = res.headers.get('content-type') ?? 'missing content-type';
        if ((res.status !== 200 && res.status !== 206) || !type.includes('video/mp4')) {
          return result(
            false,
            this.name,
            `expected 200/206 video/mp4 response, got ${res.status} ${type}`,
          );
        }
        const bytes = await res.arrayBuffer();
        if (bytes.byteLength < 1024) {
          return result(false, this.name, `expected at least 1024 bytes, got ${bytes.byteLength}`);
        }
        return result(
          true,
          this.name,
          `${type} ${res.headers.get('content-range') ?? `${bytes.byteLength} bytes`}`,
        );
      },
    },
    {
      name: 'subscribe invalid-email path',
      async run() {
        const body = new URLSearchParams({
          email: 'not-an-email',
          source: 'production_probe',
        }).toString();
        const res = await opts.fetch(`${baseUrl}/api/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          redirect: 'manual',
        });
        const location = res.headers.get('location') ?? '';
        if (res.status !== 303 || location !== '/?error=invalid_email#signup') {
          return result(
            false,
            this.name,
            `expected 303 invalid_email redirect, got ${res.status} ${location || '(no location)'}`,
          );
        }
        return result(true, this.name, location);
      },
    },
  ];
}
