import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);

  // Hub: π · 30² · 10 ≈ 28274 mm³.
  // 6 tabs · 8 · 4 · 10 = 1920 mm³ (each tab sits just outside the hub rim,
  // so no overlap subtracts from the sum).
  // Expected ≈ 30194 mm³ ± tolerance for OCCT meshing precision.
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance of hub-plus-6-tabs':
        s.volume > 30000 && s.volume < 30400,
      'bbox spans hub + outer-tab reach (X ~76, Z = 10)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 76) < 2 &&
        (s.bbox.max[1] - s.bbox.min[1]) > 60 &&
        (s.bbox.max[1] - s.bbox.min[1]) < 80 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 10) < 0.5,
    },
  };
}
