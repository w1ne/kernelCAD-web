import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) return { gates: { 'evaluates clean': false }, scored: {} };
  const removedErrs = ev.diagnostics.filter((d) => d.code === 'feature.face-ref.removed');
  const fallbackWarns = ev.diagnostics.filter((d) => d.code === 'feature.created-ref.fallback-used');
  const s = await getShapeInfo(scriptPath);
  // Pre-fillet bore volume on a 100×60×20 plate: 100*60*20 - π·9·20 ≈ 119 435 mm³.
  const plateVol = 100 * 60 * 20;
  const boreVol = Math.PI * 9 * 20;
  const preFilletVol = plateVol - boreVol;
  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
      'no face-ref.removed errors': removedErrs.length === 0,
      'at most one fallback warning': fallbackWarns.length <= 1,
      // Post-fillet volume is slightly less than the un-filleted block-with-bore
      // (the wall fillet shaves a sliver off the bore wall corners).
      'volume in expected range':
        s.volume > preFilletVol - 100 && s.volume < preFilletVol + 5,
    },
    scored: {},
  };
}
