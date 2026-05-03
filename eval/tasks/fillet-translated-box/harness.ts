import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  const rawDims: [number, number, number] = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ];
  const dims = [...rawDims].sort((a, b) => b - a); // [largest, mid, smallest]
  const bboxVol = dims[0] * dims[1] * dims[2];
  const volRatio = s.volume / bboxVol;
  // Was the body translated away from the origin in X or Y?
  // (z-min is allowed to be 0 — bottom face on the build plane.)
  const translatedXY = Math.abs(s.bbox.min[0]) > 1 || Math.abs(s.bbox.min[1]) > 1;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      // Fillet present: a plain box has volume == bboxVol; a filleted box has
      // volume slightly below it. 0.95–0.999 is the "lightly rounded box" band.
      'fillet present': volRatio > 0.95 && volRatio < 0.999,
      // Translation present: bbox min is not at the origin in X or Y.
      'translated in plane': translatedXY,
    },
    scored: {
      // bbox aspect is box-like (largest / smallest not absurd).
      'bbox shape is box-like': dims[0] / dims[2] < 20 && dims[2] > 1,
      // Volume in the lightly-rounded-box band (tighter than the gate).
      'volume in lightly-rounded band': volRatio > 0.97 && volRatio < 0.998,
    },
  };
}
