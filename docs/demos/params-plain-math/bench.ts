// Plain-math param edit vs a full rebuild on a model with many unrelated features.
// Run: npx tsx docs/demos/params-plain-math/bench.ts
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';

const code = `
const tabAngle = param('tabAngle', 30, { min: 0, max: 80, unit: '°' });
let plate = box(160, 120, 8).fillet(3);
for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
  plate = plate.subtract(cylinder(10, 3).translate(15 + i * 26, 18 + j * 28, -1));
}
// One tab, angled with plain trig on the param.
const rise = Math.tan(tabAngle * Math.PI / 180) * 20;
const tab = box(20, 10, 4 + rise).translate(150, 55, 0);
return plate.union(tab);
`;
const t0 = performance.now();
const model = await buildModel({ code, fileName: 'bench.kcad.ts' });
const full = performance.now() - t0;
const height = () => { const b = model.rootShape!.boundingBox({ exact: true }); return +(b.max[2] - b.min[2]).toFixed(3); };
console.log(JSON.stringify({ step: 'build', ms: Math.round(full), records: model.records.length, coerced: [...model.session.coercedParams], heightMm: height() }));
for (const v of [45, 60]) {
  const t = performance.now();
  const { result } = await updateModelParams(model, [{ name: 'tabAngle', value: v }]);
  console.log(JSON.stringify({ step: `tabAngle=${v}`, ms: Math.round(performance.now() - t), relowered: result.relowered.length, reused: result.skipped.length, heightMm: height() }));
}
const t2 = performance.now();
await buildModel({ code: model.code!, fileName: 'bench.kcad.ts' });
console.log(JSON.stringify({ step: 'full rebuild at tabAngle=60', ms: Math.round(performance.now() - t2) }));
