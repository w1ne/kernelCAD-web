import { it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildUsecase, bbox, holesOf, isClosedSolid, minWallOk } from './usecaseChecks';
const dirs = readdirSync('eval/tasks').filter(d => d.startsWith('usecase-') && (!process.env.ONLY || d.includes(process.env.ONLY)));
const r = (v: number[]) => v.map(x => Math.round(x * 1000) / 1000);
for (const d of dirs) {
  it(d, async () => {
    const t0 = Date.now();
    const b = await buildUsecase(join('eval/tasks', d, 'solution-expert.kcad.ts'));
    console.log('##', d, Date.now() - t0, 'ms clean', b.clean, b.diagnostics.map(x => `${x.severity}:${x.code}:${x.message.slice(0, 200)}`));
    console.log('## walls', JSON.stringify(b.dfm?.walls.map(w => [w.part, w.result.thinnestMm, w.result.violations.length])), 'minWallOk', minWallOk(b, 1.2));
    for (const p of b.parts) {
      const bb = bbox(p.shape);
      console.log('## part', p.name, 'vol', p.shape.volume().toFixed(2), 'min', r(bb.min), 'max', r(bb.max), 'closed', isClosedSolid(p.shape));
      if (!process.env.NOHOLES) for (const h of holesOf(p.shape)) console.log('##   hole', h.kind, h.diameterMm.toFixed(3), r(h.axisOrigin), r(h.axisDirection), h.depthMm.toFixed(2));
    }
  }, 600000);
}
