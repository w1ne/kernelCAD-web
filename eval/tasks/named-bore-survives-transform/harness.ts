import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  // Plate 40×40×10 = 16000 mm³. Through bore Ø6 = π·9·10 ≈ 282 mm³.
  // Tiny fillet contributes ~negligible. Final ≈ 15718 mm³.
  // Rotation + translate preserves volume.
  const expectedMin = 15600;
  const expectedMax = 15780;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'volume preserved through transforms':
        s.volume > expectedMin && s.volume < expectedMax,
    },
  };
}
