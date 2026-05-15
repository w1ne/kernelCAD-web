import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }
  const s = await getShapeInfo(scriptPath);
  const heightZ = s.bbox.max[2] - s.bbox.min[2];
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'fold raises body above the sheet': heightZ > 10,
    },
    scored: {
      // After a 90 degree fold along the midline of a 100 mm rectangle:
      // - vertical leg rises 50 mm (half-rectangle) — so height in Z >> sheet thickness.
      'height in plausible L-bracket range (10-80 mm)': heightZ > 10 && heightZ < 80,
      'roughly preserves sheet volume (within 20%)':
        Math.abs(s.volume - 100 * 60 * 2) < 0.2 * 100 * 60 * 2,
    },
  };
}
