import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  // Plate 100×100×10 = 100000 mm³. The four holes remove a meaningful volume —
  // we use a wide tolerance because the cb/csk shapes are nontrivial to compute exactly.
  const plateVol = 100000;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'plate is mostly intact (>= 95% of bbox)': s.volume > plateVol * 0.95,
      'plate has holes (< 99% of bbox)':         s.volume < plateVol * 0.99,
      'bbox is plate-sized (100×100×10)':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 100) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 100) < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 10) < 0.5,
    },
  };
}
