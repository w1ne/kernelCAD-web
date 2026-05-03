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
  // X and Y bbox extents (plate is square in the X/Y plane). Z is plate thickness.
  const xExt = rawDims[0];
  const yExt = rawDims[1];

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      // Hole + fillet remove a few percent of bbox volume; the plain plate
      // would have volRatio == 1. 0.5–0.97 catches "has a real hole".
      'has hole and fillet': volRatio > 0.5 && volRatio < 0.97,
      // Plate is square in the X/Y plane (the two largest bbox dims should be
      // equal within fillet tolerance).
      'plate is square in XY': Math.abs(xExt - yExt) < 0.5,
      // Plate is thin (Z is the smallest bbox dim).
      'plate-like aspect': dims[2] === Math.min(rawDims[0], rawDims[1], rawDims[2]) && dims[0] / dims[2] > 2,
    },
    scored: {
      // Volume in expected range for plate-with-hole-with-fillet.
      'volume in expected range': volRatio > 0.7 && volRatio < 0.97,
      // Bottom of plate sits on the build plane.
      'sits on build plane': Math.abs(s.bbox.min[2]) < 0.5,
    },
  };
}
