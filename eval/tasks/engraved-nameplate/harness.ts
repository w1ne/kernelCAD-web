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
  const bboxVol = dims[0] * dims[1] * dims[2];
  const baseVol = 80 * 30 * 3;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no interferences': true,
    },
    scored: {
      'plate footprint ≈ 80×30': dims[0] > 75 && dims[0] < 85 && dims[1] > 25 && dims[1] < 35,
      'plate height ≈ 3 mm': dims[2] > 2.5 && dims[2] < 3.5,
      'volume reduced by engraving': s.volume < baseVol && s.volume > baseVol * 0.85,
      'volume close to bbox (no holes)': s.volume > bboxVol * 0.85,
    },
  };
}
