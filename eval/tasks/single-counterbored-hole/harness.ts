import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  // Plate bbox 60×60×12 = 43200 mm³.
  // Bolt bore Ø6 through 12 = π·9·12 ≈ 339 mm³.
  // Counterbore Ø11 annular shoulder ((30.25-9)·π·4) ≈ 267 mm³.
  // Total removed ≈ 606 mm³ → expected vol ≈ 42594.
  const expectedMin = 42500;
  const expectedMax = 42900;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of plate-minus-cb-hole':
        s.volume > expectedMin && s.volume < expectedMax,
      'bbox is plate-sized (60×60×12)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 60) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 60) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 12) < 0.5,
    },
  };
}
