import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  const dims = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ].sort((a, b) => b - a);
  const baseVol = 60 * 60 * 2;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'base footprint ≈ 60×60 (with rotated text extending beyond)': dims[0] > 55 && dims[0] < 75 && dims[1] > 55 && dims[1] < 75,
      'total height ≈ 3.5 mm (base + relief)': dims[2] > 3.2 && dims[2] < 3.8,
      'relief adds volume': s.volume > baseVol * 1.02,
    },
  };
}
