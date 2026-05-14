import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      // Sphere(10) dominates X/Y bbox; smoothBlend pad = k=3.
      // Cylinder (h=24 centred) gives z-extent 24+pad.
      'x extent in sphere-with-pad band':
        (s.bbox.max[0] - s.bbox.min[0]) > 18 &&
        (s.bbox.max[0] - s.bbox.min[0]) < 30,
      'y extent in sphere-with-pad band':
        (s.bbox.max[1] - s.bbox.min[1]) > 18 &&
        (s.bbox.max[1] - s.bbox.min[1]) < 30,
      'z extent in cylinder-with-pad band':
        (s.bbox.max[2] - s.bbox.min[2]) > 22 &&
        (s.bbox.max[2] - s.bbox.min[2]) < 34,
    },
  };
}
