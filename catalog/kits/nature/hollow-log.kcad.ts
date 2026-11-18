// Original kernelCAD low-poly hollow log: a fallen faceted log tube with a
// dark hollow core, pale cut-wood rings at both ends and an optional moss
// patch on top. Lies along X, centred, resting on z = 0.

meta({
  name: 'hollow-log',
  license: 'CC0-1.0',
  title: 'Hollow log',
  description: 'Fallen hollow log you can see (or crawl) through, with a dark rotten core, pale cut ends and an optional moss patch. Knobs: length, diameter, moss, bark, wood, hollow and moss colours.',
  tags: ['log', 'hollow log', 'fallen tree', 'tunnel', 'deadwood', 'forest floor', 'den', 'wood', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'swamp', 'meadow'],
  triangleBudget: 300,
});

const lengthM = param('lengthM', '2', { choices: ['1.2', '2', '3'], label: 'Length (m)' });
const diameter = param('diameter', '0.7', { choices: ['0.5', '0.7', '1'], label: 'Diameter (m)' });
const moss = param('moss', 'yes', { choices: ['yes', 'no'], label: 'Moss patch' });
const bark = param('bark', '#5f4632', { label: 'Bark' });
const wood = param('wood', '#c89a62', { label: 'Cut wood' });
const hollow = param('hollow', '#2f2218', { label: 'Hollow' });
const mossColor = param('mossColor', '#5f8a34', { label: 'Moss' });

presets({
  birch: { bark: '#e6e2d6', wood: '#e0c08a' },
  mossy: { bark: '#4f5a34' },
});

const L = Number(lengthM.value) * 1000;
const R = (Number(diameter.value) * 1000) / 2;
const s = 8;
const e = Math.min(40, L * 0.03);

const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Tube along X from x0, length len. rotateY(90) lays the +Z extrusion along
// +X with the profile's angle-0 vertex pointing down, so the outer tube
// touches z = -R exactly; everything is lifted by R.
const tube = (ro: number, ri: number, x0: number, len: number) =>
  ngon(ro, s).extrude(len).subtract(ngon(ri, s).extrude(len + 20).translate(0, 0, -10)).rotateY(90).translate(x0, 0, R);

const log = assembly('hollow-log');
log.part('bark', tube(R, R * 0.8, -L / 2 + e, L - 2 * e).color(bark));
log.part('end-1', tube(R * 0.96, R * 0.66, -L / 2, e).color(wood));
log.part('end-2', tube(R * 0.96, R * 0.66, L / 2 - e, e).color(wood));
log.part('hollow', tube(R * 0.8, R * 0.66, -L / 2 + e, L - 2 * e).color(hollow));

if (moss.value === 'yes') {
  // Irregular moss pad draped over the top facet.
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (2 * Math.PI * k) / 8;
    const rr = 0.85 + 0.15 * Math.sin(k * 2.3);
    pts.push([L * 0.22 * rr * Math.cos(a), R * 0.55 * rr * Math.sin(a)]);
  }
  log.part('moss', extrudePolygon(pts, 30).translate(-L * 0.1, 0, R * 1.95 - 12).color(mossColor));
}

return log.model();
