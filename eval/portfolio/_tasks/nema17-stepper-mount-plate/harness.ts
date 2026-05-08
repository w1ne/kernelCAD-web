import { evaluateScript, getShapeInfo } from '../../../oracle/kernelcad-client';
import type { HarnessResult } from '../../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);

  // Plate 70×70×5 = 24500 mm^3.
  // Motor center bore: π·(11.5)^2·5 ≈ 2078.
  // 4× M3 (Ø3.4): 4·π·(1.7)^2·5 ≈ 181.
  // 4× M5 (Ø5.4): 4·π·(2.7)^2·5 ≈ 458.
  // Expected solid volume ≈ 24500 - 2078 - 181 - 458 ≈ 21783 mm^3.
  const expectedMin = 21500;
  const expectedMax = 22100;

  const dx = s.bbox.max[0] - s.bbox.min[0];
  const dy = s.bbox.max[1] - s.bbox.min[1];
  const dz = s.bbox.max[2] - s.bbox.min[2];

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume within tolerance':
        s.volume > expectedMin && s.volume < expectedMax,
      'plate is 70 mm square':
        Math.abs(dx - 70) < 0.5 && Math.abs(dy - 70) < 0.5,
      'plate is 5 mm thick':
        Math.abs(dz - 5) < 0.5,
      'has nine bores (volume markedly less than bbox)':
        s.volume < dx * dy * dz * 0.92,
    },
  };
}
