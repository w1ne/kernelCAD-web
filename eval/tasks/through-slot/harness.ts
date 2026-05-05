import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  // Plate 60×40×6 = 14400 mm³. Slot 30×6×6 = 1080 mm³.
  // Filleted walls reduce volume marginally. Expected ≈ 13320, with wider tolerance.
  const expectedMin = 13150;
  const expectedMax = 13350;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of plate-minus-through-slot':
        s.volume > expectedMin && s.volume < expectedMax,
      'bbox is plate-sized (60×40×6)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 60) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 40) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 6) < 0.5,
    },
  };
}
