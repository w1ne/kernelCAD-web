// Original kernelCAD low-poly oil lamp: a genie-style brass lamp with an
// oval bellied body on a foot, a long rising spout with a flame at the tip,
// a domed lid and a loop handle, or a squat Roman clay lamp.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, spout to +X.

meta({
  name: 'oil-lamp',
  license: 'CC0-1.0',
  title: 'Oil lamp',
  description: 'Genie-style brass oil lamp with a bellied body, long spout with a burning flame, domed lid and loop handle, or a squat Roman clay lamp, as a magic pickup or table light. Knobs: style, lit, size, metal, lid and flame colours.',
  tags: ['oil lamp', 'genie lamp', 'magic lamp', 'aladdin', 'brass', 'flame', 'pickup', 'treasure', 'arabian'],
  kit: 'lighting',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'fantasy', 'medieval', 'desert', 'dungeon', 'treasure'],
  triangleBudget: 320,
});

const style = param('style', 'genie', { choices: ['genie', 'roman'], label: 'Style' });
const lit = param('lit', 'on', { choices: ['on', 'off'], label: 'Lit' });
const size = param('size', 'standard', { choices: ['small', 'standard', 'large'], label: 'Size' });
const metal = param('metal', '#c9992e', { label: 'Body' });
const lid = param('lid', '#e0b84a', { label: 'Lid and foot' });
const flame = param('flame', '#ff6a1a', { label: 'Flame' });

presets({
  silver: { metal: '#b8bcc4', lid: '#d8dce2' },
  clay: { style: 'roman', metal: '#b0603a', lid: '#8a4a2c' },
  cursed: { metal: '#3a3442', lid: '#5a4a6a', flame: '#7af06a' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.5 : 1;
const genie = style.value === 'genie';
const N = 8;
const ngon = (r: number, n = N, rot = Math.PI / 8) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n = N) =>
  ngon(rs[0][0] * s, n).loft(rs.slice(1).map(([r]) => ngon(r * s, n)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });
const seg = (x0: number, z0: number, x1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box((len + t) * s, t * s, t * s, true).rotateY(-a).translate(((x0 + x1) / 2) * s, 0, ((z0 + z1) / 2) * s);
};

const l = assembly('oil-lamp');
// Body: an oval belly (an octagon loft stretched along X).
const belly: [number, number][] = genie
  ? [[24, 12], [44, 28], [42, 48], [24, 62], [14, 68]]
  : [[34, 10], [48, 20], [44, 34], [22, 42]];
l.part('body', rings(belly).scale([1.45, 1, 1]).color(metal));
l.part('foot', rings(genie ? [[30, 0], [22, 8], [22, 14]] : [[30, 0], [32, 12]]).color(lid));
// Spout: a tapering hexagon tube tilted up towards +X; tip position for the flame.
const sLen = genie ? 95 : 45;
const tilt = genie ? 68 : 85;
const sx = genie ? 45 : 50;
const sz = genie ? 38 : 26;
l.part('spout', ngon(16 * s, 6).loft(ngon(6 * s, 6), { spacing: sLen * s, ruled: true })
  .rotateY(tilt).translate(sx * s, 0, sz * s).color(metal));
const tipX = sx + sLen * Math.sin((tilt * Math.PI) / 180);
const tipZ = sz + sLen * Math.cos((tilt * Math.PI) / 180);
// Lid: a domed cap with a finial (genie) or a filling hole rim (roman).
l.part('lid', genie
  ? rings([[18, 66], [16, 76], [6, 86], [8, 92], [1, 104]])
    .color(lid)
  : rings([[16, 40], [14, 46]]).color(lid));
// Handle: a loop of angled bars at -X.
const hp: [number, number][] = genie
  ? [[-52, 52], [-88, 66], [-104, 44], [-90, 20], [-56, 22]]
  : [[-58, 32], [-84, 40], [-88, 24], [-60, 18]];
hp.slice(1).forEach(([x, z], i) => l.part(`handle-${i + 1}`, seg(hp[i][0], hp[i][1], x, z, 9).color(metal)));
if (lit.value === 'on') {
  l.part('flame', ngon(8 * s, 5, 0).loft([ngon(13 * s, 5, 0.6), ngon(1 * s, 5, 1.2)], {
    planes: [0, 18, 62].map((dz) => ({ plane: 'XY' as const, origin: [(tipX + (dz > 30 ? 5 : 0)) * s, 0, (tipZ - 4 + dz) * s] as [number, number, number] })),
    ruled: true,
  }).color(flame));
}

return l.model();
