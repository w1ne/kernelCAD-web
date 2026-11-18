// Original kernelCAD low-poly driftwood: a bleached, crooked log lying on its
// side with a splayed root crown at the thick end and snapped branch stubs.
// Lies along X, root end at -X, resting on z = 0.

meta({
  name: 'driftwood',
  license: 'CC0-1.0',
  title: 'Driftwood',
  description: 'Sun-bleached driftwood log lying on its side with a splayed root crown and snapped branch stubs, for beaches, rivers and lakeshores. Knobs: length, roots, wood and root colours.',
  tags: ['driftwood', 'log', 'beach', 'shore', 'river', 'deadwood', 'root', 'weathered', 'wood', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'beach', 'water', 'swamp'],
  triangleBudget: 300,
});

const lengthM = param('lengthM', '2.5', { choices: ['1.5', '2.5', '4'], label: 'Length (m)' });
const roots = param('roots', '5', { choices: ['3', '5', '7'], label: 'Roots' });
const wood = param('wood', '#cfc4b0', { label: 'Weathered wood' });
const rootColor = param('rootColor', '#b0a48e', { label: 'Roots' });

presets({
  dark: { wood: '#8a7a64', rootColor: '#6e604e' },
  wet: { wood: '#9a8e7a', rootColor: '#7a6e5c' },
});

const L = Number(lengthM.value) * 1000;
const nr = Number(roots.value);
const r0 = L * 0.06;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Horizontal tapered piece from (x, y) heading az degrees, axis at height zc.
// rotateY(90) lays the +Z loft along +X with the profile's angle-0 vertex
// pointing down, so the thick end touches z = zc - ra.
const seg = (ra: number, rb: number, len: number, x: number, y: number, az: number, zc: number, s = 6) =>
  ngon(ra, s).loft(ngon(rb, s), { spacing: len, ruled: true }).rotateY(90).rotateZ(az).translate(x, y, zc);

const drift = assembly('driftwood');
const x0 = -L / 2 + r0;
const l1 = L * 0.55;
drift.part('log', seg(r0, r0 * 0.7, l1 + r0 * 0.4, x0, 0, 6, r0).color(wood));
const jx = x0 + l1 * Math.cos((6 * Math.PI) / 180);
const jy = l1 * Math.sin((6 * Math.PI) / 180);
drift.part('log-tip', seg(r0 * 0.72, r0 * 0.3, L - r0 - l1, jx, jy, -10, r0, 5).color(wood));

// Root crown: thin tapered roots splaying back and out from the thick end,
// tilted so their tips rise; each starts at the log's axis height.
for (let i = 0; i < nr; i++) {
  const a = (360 * i) / nr + 15;
  const len = L * (0.16 + 0.05 * Math.sin(i * 2.3));
  const rise = 10 + 50 * (0.5 + 0.5 * Math.sin((a * Math.PI) / 180));
  const side = 25 * Math.cos((a * Math.PI) / 180);
  const root = ngon(r0 * 0.38, 4).loft(ngon(r0 * 0.08, 4), { spacing: len, ruled: true })
    .rotateY(-90 + rise).rotateZ(side).translate(x0 + r0 * 0.3, 0, r0 + r0 * 0.25);
  drift.part(`root-${i + 1}`, root.color(rootColor));
}
// Snapped branch stubs on the upper side.
for (const [t, az, tilt] of [[0.35, 30, 55], [0.62, -40, 60], [0.8, 20, 50]] as const) {
  const bx = -L / 2 + t * L;
  const st = ngon(r0 * 0.3, 5).loft(ngon(r0 * 0.2, 5), { spacing: r0 * 1.8, ruled: true }).rotateY(tilt).rotateZ(az).translate(bx, t * L * 0.04, r0 * 1.5);
  drift.part(`stub-${Math.round(t * 100)}`, st.color(wood));
}

return drift.model();
