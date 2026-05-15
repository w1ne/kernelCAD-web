import { readFileSync } from 'node:fs';
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';
import { reviewCadTool } from '../../../src/mcp/tools/reviewCad';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const review = await reviewCadTool({
    file: scriptPath,
    includePoseEnvelope: true,
    includeInterference: false,
    gripperAperture: { left: 'left-finger.tip', right: 'right-finger.tip' },
  });

  const apertureSummary = review.gripperAperture;
  const aperturePresent = apertureSummary !== undefined;

  const minMm = apertureSummary?.minMm;
  const maxMm = apertureSummary?.maxMm;
  const minWithinTolerance = typeof minMm === 'number' && Math.abs(minMm - 0) <= 1;
  const maxWithinTolerance = typeof maxMm === 'number' && Math.abs(maxMm - 50) <= 1;

  const src = readFileSync(scriptPath, 'utf8');
  // Match a prismatic-mate limits declaration. The exact bound expression may
  // be a literal `25` or a named constant (e.g. `travelMm`); we only require
  // that `limitsMm:` appears at least once on the script.
  const declaresPrismaticLimits = /limitsMm\s*:\s*\[/.test(src);

  return {
    gates: {
      'evaluates clean': true,
      'aperture summary present': aperturePresent,
    },
    scored: {
      'minMm within 1mm of 0': minWithinTolerance,
      'maxMm within 1mm of 50': maxWithinTolerance,
      'declares prismatic limitsMm': declaresPrismaticLimits,
    },
  };
}
