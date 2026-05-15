import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);

  // 6 tiles, each 20×50×6 = 6000 mm³ → 36000 mm³ total.
  // 6 holes Ø5 through 6 = 6 · π · (5/2)² · 6 ≈ 707 mm³ removed.
  // Expected ≈ 35293 mm³ ± wider tolerance.
  // bbox X = 20 + 5*30 = 170; bbox Y = 50; bbox Z = 6.
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of 6-tiles-minus-6-bolts':
        s.volume > 35000 && s.volume < 35600,
      'bbox spans the 6-tile array (~170 × 50 × 6)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 170) < 1 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 50) < 1 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 6) < 1,
    },
  };
}
