// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Explode-option forwarding for render_preview. Chromium is mocked; this
// pins that { explode: { factor, mode } } is validated and handed to the
// same headlessRender pipeline as kernelcad render --explode.

import { describe, it, expect, beforeAll } from 'vitest';
import { renderPreviewTool, type RenderPreviewDeps } from './renderPreview';
import type { HeadlessRenderOpts, HeadlessRenderResult } from '../../render/headlessRender';
import { getToolDefinition } from '../toolRegistry';

function makeDeps(): { deps: RenderPreviewDeps; captured: () => HeadlessRenderOpts | undefined } {
  let seen: HeadlessRenderOpts | undefined;
  const deps: RenderPreviewDeps = {
    render: async (opts: HeadlessRenderOpts): Promise<HeadlessRenderResult> => {
      seen = opts;
      return {
        pngsByView: { iso: Buffer.from('png') },
        pngsByPose: {},
        bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      } as unknown as HeadlessRenderResult;
    },
    resolveBaseUrl: async () =>
      ({ baseUrl: 'http://stub', source: 'static-player', close: async () => undefined }) as never,
    mechanismProbe: async () => ({ mechanism: 'unverified' as const, failures: [] }),
  };
  return { deps, captured: () => seen };
}

const CUBE = 'return box(10, 10, 10);';
const ARM = `
const arm = assembly('a');
arm.part('p', box(10, 10, 10));
return arm.model();
`;

beforeAll(async () => {
  const { initOcct } = await import('../../../kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

describe('render_preview explode option', () => {
  it('forwards a validated explode payload to the renderer', async () => {
    const { deps, captured } = makeDeps();
    const out = await renderPreviewTool(
      { code: ARM, views: ['iso'], explode: { factor: 1.5, mode: 'radial' } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(captured()?.explode).toEqual({ factor: 1.5, mode: 'radial' });
  });

  it('defaults explode mode to mate-axis when only factor is given', async () => {
    const { deps, captured } = makeDeps();
    await renderPreviewTool(
      { code: ARM, views: ['iso'], explode: { factor: 1 } },
      deps,
    );
    expect(captured()?.explode).toEqual({ factor: 1, mode: 'mate-axis' });
  });

  it('omits explode from render opts when not requested', async () => {
    const { deps, captured } = makeDeps();
    await renderPreviewTool({ code: ARM, views: ['iso'] }, deps);
    expect(captured()?.explode).toBeUndefined();
  });

  it('refuses explode on a non-assembly with render.explode.no-assembly', async () => {
    const { deps, captured } = makeDeps();
    const out = await renderPreviewTool(
      { code: CUBE, views: ['iso'], explode: { factor: 1, mode: 'radial' } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('render.explode.no-assembly');
    expect(captured()).toBeUndefined();
  });

  it('refuses a non-finite factor instead of rendering an assembled pose silently', async () => {
    const { deps, captured } = makeDeps();
    const out = await renderPreviewTool(
      { code: ARM, views: ['iso'], explode: { factor: Number.NaN, mode: 'radial' } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/explode/i);
    expect(captured()).toBeUndefined();
  });

  it('advertises explode on the render_preview schema', () => {
    const def = getToolDefinition('render_preview');
    const props = def!.inputSchema.properties as Record<string, unknown>;
    expect(props.explode).toBeDefined();
  });
});
