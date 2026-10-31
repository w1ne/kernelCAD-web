// Reduced roadster analogue: six rounded body stations built as two 3-station
// spans. The sewn path must be fast (two small skins) but is C0 at the shared
// station; the G1/G2 path must produce one multi-span skin with no station
// seams (the previous single-loft quality, without claiming to speed it up).
import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { Sketch } from '../../../../src/modeling/capture/sketch';
import { loftSkinContinuityShortfalls } from '../../../../src/kernel/backends/occt/segmentedLoft';
import type { OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

const RADII = [8, 10.5, 12, 12, 10.5, 8];
const Z = [0, 20, 40, 60, 80, 100];

function station(kcad: ReturnType<typeof createModelingApi>, r: number): Sketch {
  const segments = 16;
  let p = kcad.path().moveTo(r, 0);
  for (let i = 1; i < segments; i++) {
    const t = (2 * Math.PI * i) / segments;
    p = p.lineTo(r * Math.cos(t), r * Math.sin(t));
  }
  return p.close();
}

function stations(kcad: ReturnType<typeof createModelingApi>) {
  return RADII.map((r) => station(kcad, r));
}

const PLANES = Z.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] }));

function build(opts: Record<string, unknown>) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const [first, ...rest] = stations(kcad);
  const shape = first.loft(rest, { planes: PLANES, ...opts } as never);
  return { session, shape };
}

describe('segmented loft', () => {
  beforeAll(async () => { await initOcct(); });

  it('sewn G0 spans build one solid with the same volume as the single skin', async () => {
    const single = await build({}).shape.lower();
    const sewn = await build({ mode: 'sewn', spanSize: 3 }).shape.lower();
    expect(sewn.volume()).toBeGreaterThan(0);
    expect(Math.abs(sewn.volume() - single.volume()) / single.volume()).toBeLessThan(0.01);
    // Two spans produce two sets of lateral faces; one skin has a single set.
    const faceCount = (s: typeof sewn) => (s.getReplicadShape() as unknown as { faces: unknown[] }).faces.length;
    expect(faceCount(sewn)).toBeGreaterThan(faceCount(single));
  });

  it.each(['G1', 'G2'] as const)('%s requests one multi-span skin (no station seams)', async (continuity) => {
    const single = await build({}).shape.lower();
    const smooth = await build({ continuity }).shape.lower();
    expect(smooth.volume()).toBeGreaterThan(0);
    expect(Math.abs(smooth.volume() - single.volume()) / single.volume()).toBeLessThan(0.01);
    const faceCount = (s: typeof smooth) => (s.getReplicadShape() as unknown as { faces: unknown[] }).faces.length;
    expect(faceCount(smooth)).toBe(faceCount(single));
  });

  it('warns and builds one skin when sewn is combined with G1/G2', async () => {
    const { session } = build({ continuity: 'G1', mode: 'sewn', spanSize: 3 });
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.loft.continuity-requires-single')).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(false);
  });

  it('rejects spanSize < 2 at capture time', () => {
    expect(() => build({ mode: 'sewn', spanSize: 1 })).toThrow(/spanSize.*>= 2/i);
  });

  it('rejects unknown continuity and mode values at capture time', () => {
    expect(() => build({ continuity: 'G3' })).toThrow(/continuity/);
    expect(() => build({ mode: 'fused' })).toThrow(/mode/);
  });

  it('emits span-failed when sewn cannot make two spans', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const a = station(kcad, 8);
    const b = station(kcad, 10);
    a.loft(b, {
      planes: PLANES.slice(0, 2),
      mode: 'sewn',
      spanSize: 3,
    } as never);
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.loft.span-failed')).toBe(true);
  });
  // Regression for #1071 review: explicit mode/continuity options must not
  // silently drop `ruled`, and G1/G2 must be checked, not just accepted.
  it("keeps ruled: true on the explicit mode: 'single' path", async () => {
    const smooth = await build({ mode: 'single' }).shape.lower();
    const ruled = await build({ mode: 'single', ruled: true }).shape.lower();
    const plainRuled = await build({ ruled: true }).shape.lower();
    const faceCount = (s: typeof ruled) => (s.getReplicadShape() as unknown as { faces: unknown[] }).faces.length;
    // A ruled skin is split at every station; the smooth skin is not.
    expect(faceCount(ruled)).toBe(faceCount(plainRuled));
    expect(faceCount(ruled)).toBeGreaterThan(faceCount(smooth));
  });

  it('keeps ruled: true on the sewn G0 path', async () => {
    const sewnRuled = await build({ mode: 'sewn', spanSize: 3, ruled: true }).shape.lower();
    const plainRuled = await build({ ruled: true }).shape.lower();
    expect(Math.abs(sewnRuled.volume() - plainRuled.volume()) / plainRuled.volume()).toBeLessThan(0.01);
  });

  it('rejects ruled: true with G1/G2 at capture time', () => {
    expect(() => build({ continuity: 'G2', ruled: true })).toThrow(/ruled/);
    expect(() => build({ continuity: 'G1', ruled: true })).toThrow(/ruled/);
  });

  it.each(['G1', 'G2'] as const)('%s skin is verified across the stations', async (continuity) => {
    const { session } = build({ continuity });
    const result = await new RecomputeEngine(new OcctLowerer()).run(session.getRecords());
    expect(result.diagnostics.some((d) => d.code === 'feature.loft.continuity-unresolved')).toBe(false);
    const smooth = await build({ continuity }).shape.lower();
    expect(loftSkinContinuityShortfalls(smooth as unknown as OcctBackend, continuity)).toEqual([]);
  });

});
