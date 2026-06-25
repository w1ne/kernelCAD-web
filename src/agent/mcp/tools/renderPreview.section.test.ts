// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Section-plane forwarding for the render_preview MCP tool. The headless
// renderer already supports a single axis-aligned clip plane (see
// headlessRender's `section` opt); these tests pin that render_preview exposes
// it to the agent and forwards a validated `{axis, position, positionRaw, flip}`
// down to deps.render — so the agent can cut a cross-section to inspect interior
// geometry, not just the outer shell.

import { describe, it, expect } from 'vitest';
import { renderPreviewTool, type RenderPreviewDeps } from './renderPreview';
import type { HeadlessRenderOpts, HeadlessRenderResult } from '../../render/headlessRender';

/** Fake deps that never touch chromium/disk-server: mechanism probe reports
 *  'unverified', the base resolves to a stub, and render captures the opts it
 *  was handed and returns one tiny iso tile. */
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

const CUBE = 'export default () => lib.box(10, 10, 10);';

describe('render_preview section plane', () => {
  it('forwards a validated section plane to the renderer with verbatim positionRaw', async () => {
    const { deps, captured } = makeDeps();
    const out = await renderPreviewTool(
      { code: CUBE, views: ['iso'], section: { axis: 'z', position: 10 } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(captured()?.section).toEqual({ axis: 'z', position: 10, positionRaw: '10', flip: false });
  });

  it('preserves a negative/decimal position verbatim and honors flip', async () => {
    const { deps, captured } = makeDeps();
    await renderPreviewTool(
      { code: CUBE, views: ['iso'], section: { axis: 'x', position: -2.5, flip: true } },
      deps,
    );
    expect(captured()?.section).toEqual({ axis: 'x', position: -2.5, positionRaw: '-2.5', flip: true });
  });

  it('omits section from the render opts when not requested', async () => {
    const { deps, captured } = makeDeps();
    await renderPreviewTool({ code: CUBE, views: ['iso'] }, deps);
    expect(captured()?.section).toBeUndefined();
  });

  it('refuses an invalid section value instead of rendering silently unclipped', async () => {
    const { deps, captured } = makeDeps();
    const out = await renderPreviewTool(
      // Non-finite position cannot be expressed as a clip plane.
      { code: CUBE, views: ['iso'], section: { axis: 'z', position: Number.NaN } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/section/i);
    expect(captured()).toBeUndefined();
  });
});
