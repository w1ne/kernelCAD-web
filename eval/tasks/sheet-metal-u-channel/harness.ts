import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const s = await getShapeInfo(scriptPath);
  const heightZ = s.bbox.max[2] - s.bbox.min[2];
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'two folds raise body above sheet': heightZ > 10,
    },
    scored: {
      'U-channel height plausible (10-100 mm)': heightZ > 10 && heightZ < 100,
    },
  };
}
