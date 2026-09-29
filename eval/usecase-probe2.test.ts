import { it } from 'vitest';
import { buildUsecase, minWallOf } from './usecaseChecks';
it('vase', async () => {
  const b = await buildUsecase('eval/tasks/usecase-twisted-vase/solution-expert.kcad.ts');
  const r = minWallOf(b.parts[0].shape, 1.2);
  console.log('##', r.thinnestMm, r.sampleCount, JSON.stringify(r.violations.map(v => ({ t: v.thicknessMm, at: v.location, n: (v as any).sampleCount ?? (v as any).count }))));
}, 900000);
