import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const faceRefErrs = ev.diagnostics.filter((d) => d.code.startsWith('feature.face-ref'));
  const fallbackWarns = ev.diagnostics.filter((d) => d.code === 'feature.created-ref.fallback-used');
  const s = await getShapeInfo(scriptPath);
  const plateVol = 100 * 60 * 5;
  const boreVol = Math.PI * 3 * 3 * 3;
  const removed = plateVol - s.volume;
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'bbox is plate-sized':
        Math.abs((s.bbox.max[0] - s.bbox.min[0]) - 100) < 0.5 &&
        Math.abs((s.bbox.max[1] - s.bbox.min[1]) - 60)  < 0.5 &&
        Math.abs((s.bbox.max[2] - s.bbox.min[2]) - 5)   < 0.5,
      'blind hole drilled (depth 3)': removed > boreVol * 0.85 && removed < boreVol * 1.15,
      'no face-ref.* errors': faceRefErrs.length === 0,
      'no fallback warning on happy path': fallbackWarns.length === 0,
    },
    scored: {},
  };
}
