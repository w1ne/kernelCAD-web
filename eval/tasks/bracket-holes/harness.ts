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
  ].sort((a, b) => b - a); // sorted descending: [largest, mid, smallest]
  const bboxVol = dims[0] * dims[1] * dims[2];

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'L-shape (2 axes > 10mm)': dims[0] > 10 && dims[1] > 10,
      'has holes (vol < 70% bbox)': s.volume < bboxVol * 0.7,
      'not paper-thin (min dim > 2mm)': dims[2] > 2,
    },
  };
}
