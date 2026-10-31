// Original kernelCAD low-poly reeds: a clump of tall thin leaning stalks, some
// topped with cattail seed heads, around a muddy root mound.

meta({
  name: 'reeds',
  title: 'Reeds',
  description: 'Clump of waterside reeds and cattails with tall leaning stalks and brown seed heads. Knobs: stalk count, height, stalk, seed head and mud colours.',
  tags: ['reeds', 'cattail', 'bulrush', 'marsh', 'pond', 'water', 'swamp', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'water', 'swamp', 'meadow'],
  triangleBudget: 200,
});

const stalks = param('stalks', '7', { choices: ['5', '7', '9'], label: 'Stalks' });
const heightM = param('heightM', '1.6', { choices: ['1', '1.6', '2.2'], label: 'Height (m)' });
const stalk = param('stalk', '#6f9a3e', { label: 'Stalks' });
const heads = param('heads', '#6a4527', { label: 'Seed heads' });
const mud = param('mud', '#5a4a36', { label: 'Root mound' });

presets({
  autumn: { stalk: '#b39a4e', heads: '#4e3420' },
});

const h = Number(heightM.value) * 1000;
const n = Number(stalks.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const rad = (d: number) => (d * Math.PI) / 180;

const reeds = assembly('reeds');
reeds.part('mound', ngon(h * 0.12, 6).loft(ngon(h * 0.06, 6, Math.PI / 6), { spacing: h * 0.04, ruled: true }).color(mud));

for (let i = 0; i < n; i++) {
  const az = (i * 360 * 0.618 + 20) % 360;
  const len = h * (0.75 + 0.25 * Math.abs(Math.sin(i * 1.7)));
  const lean = 3 + 12 * Math.abs(Math.sin(i * 2.3));
  const d = h * 0.05 * (0.3 + 0.7 * Math.abs(Math.cos(i * 1.1)));
  const x = d * Math.cos(rad(az));
  const y = d * Math.sin(rad(az));
  const r0 = h * 0.008;
  const place = (s: any) => s.rotateY(lean).rotateZ(az).translate(x, y, h * 0.02);
  reeds.part(`stalk-${i + 1}`, place(ngon(r0, 3).loft(ngon(r0 * 0.25, 3), { spacing: len, ruled: true })).color(stalk));
  if (i % 2 === 0) {
    const hr = r0 * 2.4;
    const head = ngon(hr, 5).extrude(h * 0.11).translate(0, 0, len * 0.72);
    reeds.part(`head-${i + 1}`, place(head).color(heads));
  }
}

return reeds.model();
