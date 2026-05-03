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
  const dims = [...rawDims].sort((a, b) => b - a);
  const bboxVol = dims[0] * dims[1] * dims[2];
  const naiveBoxArea = 2 * (dims[0] * dims[1] + dims[1] * dims[2] + dims[0] * dims[2]);
  const volRatio = s.volume / bboxVol;
  const saRatio = s.surfaceArea / naiveBoxArea;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      // A non-tilted box's volume == its bbox volume. A tilted box's volume is
      // strictly less (the bbox grows but the volume stays the same), so
      // volRatio drops well below 1. Tilt 5°→60° spans roughly volRatio
      // 0.97–0.43 for these param ranges; gate 0.4–0.95 catches "tilted".
      'shape is tilted': volRatio > 0.4 && volRatio < 0.95,
      // Chamfer + tilt both reduce surface area below the naive bbox-derived
      // box's area. 0.5–0.99 catches "chamfered tilted body".
      'chamfer present (SA below naive)': saRatio > 0.5 && saRatio < 0.99,
    },
    scored: {
      // bbox is reasonably proportioned (no degenerate slabs).
      'bbox shape reasonable': dims[2] / dims[0] > 0.15 && dims[0] / dims[2] < 20,
      // The body sits on the build plane (Z min ≈ 0 for the X-axis tilt
      // expected to keep the bottom edge anchored to z=0 since the box starts
      // at z=0 and tilts about [1,0,0]).
      'starts at build plane': Math.abs(s.bbox.min[2]) < 0.5,
    },
  };
}
