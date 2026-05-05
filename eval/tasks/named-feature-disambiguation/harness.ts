import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  // Plate 60×40×12 = 28800 mm³. Two through bores Ø5 = 2 · π · 6.25 · 12 ≈ 471.
  // Two fillets remove tiny additional volumes (negligible against the bore).
  // Final volume ≈ 28800 - 471 = 28329 mm³.
  const expectedMin = 28200;
  const expectedMax = 28400;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of plate-minus-2-bores':
        s.volume > expectedMin && s.volume < expectedMax,
      'bbox is plate-sized (60×40×12)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 60) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 40) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 12) < 0.5,
    },
  };
}
