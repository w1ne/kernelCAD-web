// tests/unit/mcp/renderPreviewTool.test.ts
//
// Unit tests for the `render_preview` MCP tool (#440) — browser-free via the
// tool's injectable deps seam (render / resolveBaseUrl / mechanismProbe).
// Coverage:
//   - input validation refusals (code/file exclusivity, bad views, bad pose,
//     focus+hide, width/height bounds) — every refusal carries a hint
//   - happy path: PNGs written to the session dir, per-view descriptions,
//     pose tile naming, render_source + bounds surfaced, server closed
//   - code mode: inline source lands in a temp .kcad.ts next to the PNGs
//   - broken mechanism: tiles still written (watermarked), verdict + codes
//     surfaced; strict mode (KERNELCAD_RENDER_STRICT=1) refuses instead
//   - registry: tool listed, schema fields present, hosted-clients note
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  renderPreviewTool,
  VIEW_DESCRIPTIONS,
  type RenderPreviewDeps,
} from '../../../src/agent/mcp/tools/renderPreview';
import { getToolDefinition } from '../../../src/agent/mcp/toolRegistry';
import type {
  HeadlessRenderResult,
  RenderView,
} from '../../../src/agent/render/headlessRender';
import type { CompilerDiagnostic } from '../../../src/shared/diagnostics/diagnostic';

const tmpDirs: string[] = [];

afterEach(async () => {
  delete process.env.KERNELCAD_RENDER_STRICT;
  for (const dir of tmpDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

/** A real PNG so the broken-mechanism watermark path can run sharp over it.
 *  Mid-gray, comfortably non-black, and large enough to hold the
 *  MECHANISM BROKEN overlay box (which is up to 560 px wide). */
async function fakeTile(): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 480, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .png()
    .toBuffer();
}

async function fakeRenderResult(views: readonly RenderView[], poses: readonly string[] = []): Promise<HeadlessRenderResult> {
  const tile = await fakeTile();
  const pngsByView: Partial<Record<RenderView, Buffer>> = {};
  for (const v of views) pngsByView[v] = tile;
  const pngsByPose: Record<string, Buffer> = {};
  for (const p of poses) pngsByPose[p] = tile;
  return {
    pngsByView,
    pngsByPose,
    bounds: { min: [0, 0, 0], max: [60, 40, 5] },
  };
}

function makeDeps(over: Partial<RenderPreviewDeps> & { closed?: { value: boolean } } = {}): RenderPreviewDeps {
  const closed = over.closed ?? { value: false };
  return {
    render: over.render ?? (async opts => fakeRenderResult(opts.views ?? [], opts.poses ?? [])),
    resolveBaseUrl:
      over.resolveBaseUrl ??
      (async () => ({
        baseUrl: 'http://127.0.0.1:1',
        source: 'static-player' as const,
        close: async () => {
          closed.value = true;
        },
      })),
    mechanismProbe: over.mechanismProbe ?? (async () => ({ mechanism: 'unverified' as const, failures: [] })),
  };
}

function trackOutDir(r: { out_dir?: string }): void {
  if (r.out_dir !== undefined) tmpDirs.push(r.out_dir);
}

describe('render_preview — input validation', () => {
  it('refuses when neither code nor file is given, with a hint', async () => {
    const r = await renderPreviewTool({}, makeDeps());
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.invalid-args');
    expect(r.errorHint).toBeTruthy();
    expect(r.diagnostics[0]?.hint).toBeTruthy();
  });

  it('refuses when both code and file are given', async () => {
    const r = await renderPreviewTool({ code: 'return box(1,1,1);', file: 'x.kcad.ts' }, makeDeps());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mutually exclusive/);
  });

  it('refuses unknown views', async () => {
    const r = await renderPreviewTool({ code: 'return box(1,1,1);', views: ['iso', 'back'] }, makeDeps());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown view/);
    expect(r.error).toMatch(/back/);
  });

  it('refuses a malformed pose', async () => {
    const r = await renderPreviewTool({ code: 'return box(1,1,1);', pose: 'thirty,20' }, makeDeps());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid pose/);
  });

  it('refuses focus+hide together (render-parity rule)', async () => {
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);', focus: ['a'], hide: ['b'] },
      makeDeps(),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/mutually exclusive/);
  });

  it('refuses out-of-range tile sizes', async () => {
    const r = await renderPreviewTool({ code: 'return box(1,1,1);', width: 16 }, makeDeps());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/width\/height/);
  });
});

describe('render_preview — happy path (mocked render)', () => {
  it('describes canonical views as geometric directions, not product-semantic exterior views', () => {
    expect(VIEW_DESCRIPTIONS.top).toMatch(/geometric \+Z/i);
    expect(VIEW_DESCRIPTIONS.top).toMatch(/not necessarily.*exterior/i);
    expect(VIEW_DESCRIPTIONS.iso).toMatch(/model orientation/i);
  });

  it('writes one PNG per view + pose, with descriptions and metadata', async () => {
    const closed = { value: false };
    const r = await renderPreviewTool(
      { code: 'return box(60, 40, 5);', pose: '30,20' },
      makeDeps({ closed }),
    );
    trackOutDir(r);
    expect(r.ok).toBe(true);
    expect(r.images).toHaveLength(5); // 4 canonical views + 1 pose
    for (const img of r.images) {
      expect(existsSync(img.path)).toBe(true);
      expect((await readFile(img.path)).length).toBeGreaterThan(0);
      expect(img.description.length).toBeGreaterThan(10);
    }
    const names = r.images.map(i => i.name);
    expect(names).toEqual(['front', 'right', 'top', 'iso', 'pose 30,20']);
    expect(r.images[0].description).toBe(VIEW_DESCRIPTIONS.front);
    expect(r.images[4].path.endsWith('pose-30-20.png')).toBe(true);
    expect(r.bounds).toEqual({ min: [0, 0, 0], max: [60, 40, 5] });
    expect(r.render_source).toBe('static-player');
    expect(r.mechanism).toBe('unverified');
    expect(typeof r.render_ms).toBe('number');
    expect(closed.value).toBe(true); // ephemeral server shut down
  });

  it('renders only the requested view subset', async () => {
    const r = await renderPreviewTool({ code: 'return box(1,1,1);', views: ['iso'] }, makeDeps());
    trackOutDir(r);
    expect(r.ok).toBe(true);
    expect(r.images.map(i => i.name)).toEqual(['iso']);
  });

  it('code mode writes the inline source into the session dir', async () => {
    const r = await renderPreviewTool({ code: 'return box(2,2,2);' }, makeDeps());
    trackOutDir(r);
    expect(r.ok).toBe(true);
    const script = await readFile(join(r.out_dir!, 'model.kcad.ts'), 'utf8');
    expect(script).toBe('return box(2,2,2);');
  });

  it('closes the ephemeral server even when the render throws', async () => {
    const closed = { value: false };
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);' },
      makeDeps({
        closed,
        render: async () => {
          throw new Error('browser exploded');
        },
      }),
    );
    trackOutDir(r);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.export-exception');
    expect(closed.value).toBe(true);
  });

  it('maps compile failures to cli.script-exception with an evaluate_script hint', async () => {
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);' },
      makeDeps({
        render: async () => {
          throw new Error('headlessRender: 2 feature(s) failed to compile: f1, f2');
        },
      }),
    );
    trackOutDir(r);
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('cli.script-exception');
    expect(r.errorHint).toMatch(/evaluate_script/);
  });
});

describe('render_preview — mechanism truth protocol', () => {
  const brokenFailure: CompilerDiagnostic = {
    target: 'export-occt',
    code: 'mechanism.interpenetration' as CompilerDiagnostic['code'],
    severity: 'error',
    message: 'Parts overlap.',
    hint: 'Separate the parts.',
  };

  it('still renders a broken mechanism, watermarked, with verdict + codes', async () => {
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);', views: ['iso'] },
      makeDeps({
        mechanismProbe: async () => ({ mechanism: 'broken' as const, failures: [brokenFailure] }),
      }),
    );
    trackOutDir(r);
    expect(r.ok).toBe(true);
    expect(r.mechanism).toBe('broken');
    expect(r.mechanism_failure_codes).toEqual(['mechanism.interpenetration']);
    expect(r.diagnostics).toHaveLength(1);
    // The watermark composite re-encodes the tile, so it must differ from
    // the raw fake tile AND still be a readable PNG.
    const tileBuf = await readFile(r.images[0].path);
    expect(tileBuf.equals(await fakeTile())).toBe(false);
    const meta = await sharp(tileBuf).metadata();
    expect(meta.format).toBe('png');
  });

  it('no_mechanism_check skips the probe and reports unverified', async () => {
    let probeRan = false;
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);', views: ['iso'], no_mechanism_check: true },
      makeDeps({
        mechanismProbe: async () => {
          probeRan = true;
          return { mechanism: 'broken' as const, failures: [brokenFailure] };
        },
      }),
    );
    trackOutDir(r);
    expect(r.ok).toBe(true);
    expect(probeRan).toBe(false);
    expect(r.mechanism).toBe('unverified');
  });

  it('no_mechanism_check is IGNORED under strict mode — the gate always probes', async () => {
    process.env.KERNELCAD_RENDER_STRICT = '1';
    let probeRan = false;
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);', no_mechanism_check: true },
      makeDeps({
        mechanismProbe: async () => {
          probeRan = true;
          return { mechanism: 'broken' as const, failures: [brokenFailure] };
        },
      }),
    );
    expect(probeRan).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.mechanism).toBe('broken');
  });

  it('refuses in strict mode (KERNELCAD_RENDER_STRICT=1)', async () => {
    process.env.KERNELCAD_RENDER_STRICT = '1';
    const r = await renderPreviewTool(
      { code: 'return box(1,1,1);' },
      makeDeps({
        mechanismProbe: async () => ({ mechanism: 'broken' as const, failures: [brokenFailure] }),
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.mechanism).toBe('broken');
    expect(r.error).toMatch(/MECHANISM BROKEN/);
    expect(r.images).toHaveLength(0);
  });
});

describe('render_preview — registry contract', () => {
  it('is registered with the schema fields and the hosted-clients note', () => {
    const def = getToolDefinition('render_preview');
    expect(def).toBeDefined();
    expect(def!.description).toMatch(/open_in_studio/);
    expect(def!.description).toMatch(/NO STUDIO \/ DEV-SERVER/);
    const props = def!.inputSchema.properties as Record<string, unknown>;
    for (const key of ['code', 'file', 'views', 'pose', 'focus', 'hide', 'out_dir', 'width', 'height', 'environment', 'no_watermark', 'no_mechanism_check', 'base_url']) {
      expect(props[key], `schema property ${key}`).toBeDefined();
    }
    // code|file exclusivity is runtime-enforced, so neither is required.
    expect(def!.inputSchema.required ?? []).toEqual([]);
  });
});
