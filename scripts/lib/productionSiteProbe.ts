// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

interface GalleryAsset {
  key: 'modelUrl' | 'videoUrl' | 'posterUrl' | 'promptUrl';
  path: string;
  contentTypes: string[];
  range?: boolean;
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

async function responseBytes(res: ProbeResponse): Promise<number> {
  return (await res.arrayBuffer()).byteLength;
}

function contentType(res: ProbeResponse): string {
  return res.headers.get('content-type') ?? 'missing content-type';
}

function hasExpectedContentType(actual: string, expected: string[]): boolean {
  return expected.some((type) => actual.toLowerCase().includes(type));
}

function resolveSiteUrl(baseUrl: string, pathOrUrl: string): string {
  return new URL(pathOrUrl, `${baseUrl}/`).toString();
}

function extractBuiltAssetPaths(html: string): string[] {
  const paths = new Set<string>();
  const attrRegex = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const match of html.matchAll(attrRegex)) {
    const path = match[1];
    if (/^\/assets\/[^?#]+\.(?:css|js)(?:[?#].*)?$/.test(path)) {
      paths.add(path.replace(/[?#].*$/, ''));
    }
  }
  return [...paths].sort();
}

function galleryAssetsFor(entry: Record<string, unknown>): GalleryAsset[] | undefined {
  const assets: GalleryAsset[] = [
    {
      key: 'modelUrl',
      path: String(entry.modelUrl ?? ''),
      contentTypes: ['model/gltf-binary', 'application/octet-stream'],
    },
    {
      key: 'videoUrl',
      path: String(entry.videoUrl ?? ''),
      contentTypes: ['video/mp4'],
      range: true,
    },
    {
      key: 'posterUrl',
      path: String(entry.posterUrl ?? ''),
      contentTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    },
    {
      key: 'promptUrl',
      path: String(entry.promptUrl ?? ''),
      contentTypes: ['text/markdown', 'text/plain'],
    },
  ];

  return assets.every((asset) => asset.path.length > 0) ? assets : undefined;
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
  mode?: 'marketing' | 'app';
  allGalleryAssets?: boolean;
  fetch: ProbeFetch;
}): ProductionSiteCheck[] {
  const baseUrl = normalizeSiteBaseUrl(opts.baseUrl);
  const expectedDemoIteration =
    opts.expectedDemoIteration ?? expectedIterationForVersion(opts.expectedVersion);

  if (opts.mode === 'app') {
    return [
      {
        name: 'app built assets',
        async run() {
          const htmlRes = await opts.fetch(`${baseUrl}/`);
          const htmlType = contentType(htmlRes);
          if (htmlRes.status !== 200 || !htmlType.includes('text/html')) {
            return result(
              false,
              this.name,
              `expected 200 text/html from /, got ${htmlRes.status} ${htmlType}`,
            );
          }
          const html = new TextDecoder().decode(await htmlRes.arrayBuffer());
          const assets = extractBuiltAssetPaths(html);
          if (assets.length === 0) {
            return result(false, this.name, 'expected linked /assets/*.css or /assets/*.js');
          }

          let cssCount = 0;
          let jsCount = 0;
          for (const asset of assets) {
            const res = await opts.fetch(resolveSiteUrl(baseUrl, asset));
            const type = contentType(res);
            const expectedTypes = asset.endsWith('.css')
              ? ['text/css']
              : ['application/javascript', 'text/javascript'];
            if (res.status !== 200 || !hasExpectedContentType(type, expectedTypes)) {
              return result(
                false,
                this.name,
                `${asset} expected ${expectedTypes.join(' or ')}, got ${res.status} ${type}`,
              );
            }
            const bytes = await responseBytes(res);
            if (bytes <= 0) {
              return result(false, this.name, `${asset} expected non-empty body, got ${bytes} bytes`);
            }
            if (asset.endsWith('.css')) cssCount += 1;
            if (asset.endsWith('.js')) jsCount += 1;
          }
          return result(true, this.name, `${cssCount} css, ${jsCount} js assets ok`);
        },
      },
    ];
  }

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
      name: 'gallery assets',
      async run() {
        const res = await opts.fetch(`${baseUrl}/gallery.json`);
        if (res.status !== 200) {
          return result(false, this.name, `expected 200 from /gallery.json, got ${res.status}`);
        }
        const payload = await res.json();
        if (!isObject(payload) || !Array.isArray(payload.entries)) {
          return result(false, this.name, 'expected /gallery.json entries array');
        }
        if (payload.entries.length === 0) {
          return result(false, this.name, 'expected /gallery.json to contain entries');
        }

        const entries = opts.allGalleryAssets ? payload.entries : payload.entries.slice(0, 2);
        let assetCount = 0;
        for (const entry of entries) {
          if (!isObject(entry)) {
            return result(false, this.name, 'expected gallery entry object');
          }
          const assets = galleryAssetsFor(entry);
          if (!assets) {
            return result(false, this.name, 'expected gallery entry asset URLs');
          }
          for (const asset of assets) {
            const assetInit = asset.range ? { headers: { Range: 'bytes=0-1023' } } : undefined;
            const assetRes = await opts.fetch(resolveSiteUrl(baseUrl, asset.path), assetInit);
            const type = contentType(assetRes);
            const okStatus = asset.range
              ? assetRes.status === 200 || assetRes.status === 206
              : assetRes.status === 200;
            if (!okStatus || !hasExpectedContentType(type, asset.contentTypes)) {
              return result(
                false,
                this.name,
                `${asset.path} expected ${asset.contentTypes.join(' or ')}, got ${assetRes.status} ${type}`,
              );
            }
            const bytes = await responseBytes(assetRes);
            if (bytes <= 0) {
              return result(
                false,
                this.name,
                `${asset.path} expected non-empty body, got ${bytes} bytes`,
              );
            }
            assetCount += 1;
          }
        }
        return result(true, this.name, `${entries.length} entries, ${assetCount} assets ok`);
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
