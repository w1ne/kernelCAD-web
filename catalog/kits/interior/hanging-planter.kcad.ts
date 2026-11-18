// Original kernelCAD low-poly hanging planter: a ceiling hook and cord, a
// ring with three cords cradling a round pot, a leafy mound and trailing
// vines of small leaves. Origin 'ceiling': the hook plate's top face sits on
// the z = 0 ceiling plane and the planter hangs down along -Z, centred on
// x = y = 0.

meta({
  name: 'hanging-planter',
  license: 'CC0-1.0',
  title: 'Hanging planter',
  description: 'Ceiling-hung macrame-style planter with a round pot, leafy mound and trailing vines. Knobs: drop length, vines, cord, pot and leaf colours.',
  tags: ['hanging planter', 'hanging plant', 'macrame', 'pothos', 'trailing plant', 'houseplant', 'plant', 'decor'],
  kit: 'interior',
  category: 'attachment',
  origin: 'ceiling',
  compat: ['indoor', 'living-room', 'kitchen', 'bedroom', 'porch'],
  triangleBudget: 600,
});

const drop = param('drop', '700', { choices: ['400', '700', '1000'], label: 'Drop (mm)' });
const vines = param('vines', '5', { choices: ['3', '5', '7'], label: 'Vines' });
const cord = param('cord', '#e3d6b8', { label: 'Cord' });
const pot = param('pot', '#efeee9', { label: 'Pot' });
const leaves = param('leaves', '#4f8f3a', { label: 'Leaves' });

presets({
  terracotta: { pot: '#b9653f', cord: '#d9c7a0' },
  dark: { pot: '#2b2d30', cord: '#6b4a2f', leaves: '#6aa04a' },
});

const L = Number(drop.value);
const nv = Number(vines.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const strut = (r: number, a: [number, number, number], b: [number, number, number]) =>
  ngon(r, 4).loft(ngon(r, 4), { planes: [{ plane: 'XY', origin: a }, { plane: 'XY', origin: b }], ruled: true });

const h = assembly('hanging-planter');
h.part('hook-plate', ngon(35, 6).extrude(12).translate(0, 0, -12).color(cord));
h.part('hanger', ngon(5, 4).extrude(L * 0.45 + 20).translate(0, 0, -L * 0.45 - 25).color(cord));
const rz = -L * 0.45 - 20;
h.part('ring', ngon(22, 6).extrude(10).subtract(ngon(14, 6).extrude(20).translate(0, 0, -5)).translate(0, 0, rz - 5).color(cord));
// Pot: a round faceted bowl.
const pz = -L; // pot bottom
const pr = 120;
const potH = 170;
h.part('pot', ngon(pr * 0.55, 8).loft([ngon(pr, 8), ngon(pr * 0.95, 8)], {
  planes: [
    { plane: 'XY', origin: [0, 0, pz] },
    { plane: 'XY', origin: [0, 0, pz + potH * 0.55] },
    { plane: 'XY', origin: [0, 0, pz + potH] },
  ],
  ruled: true,
}).color(pot));
for (let i = 0; i < 3; i++) {
  const a = (2 * Math.PI * i) / 3 + Math.PI / 6;
  h.part(`cord-${i + 1}`, strut(4, [pr * 1.0 * Math.cos(a), pr * 1.0 * Math.sin(a), pz + potH * 0.5], [6 * Math.cos(a), 6 * Math.sin(a), rz]).color(cord));
}
// Leafy mound spilling over the rim: jagged star rings twisted between
// levels so the facets read as overlapping leaves rather than a dome.
const jag = (r: number, rot: number) => {
  let q = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < 14; k++) {
    const a = rot + (2 * Math.PI * k) / 14;
    const rr = k % 2 === 0 ? r : r * 0.72;
    q = q.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return q.close();
};
h.part('foliage', jag(pr * 1.05, 0).loft([jag(pr * 1.15, 0.3), jag(pr * 0.45, 0.6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, pz + potH - 25] },
    { plane: 'XY', origin: [0, 0, pz + potH + 15] },
    { plane: 'XY', origin: [0, 0, pz + potH + 70] },
  ],
  ruled: true,
}).color(leaves));
// Trailing vines: chains of heart-ish diamond leaves hanging from the rim.
const leaf = () => extrudePolygon([[0, 0], [28, -25], [0, -60], [-28, -25]], 6).translate(0, 0, -3).rotateX(90);
for (let v = 0; v < nv; v++) {
  const a = (2 * Math.PI * v) / nv + 0.3;
  const len = 3 + (v % 3);
  for (let k = 0; k < len; k++) {
    const rr = pr * 0.98 + k * 6;
    const z = pz + potH - 10 - k * 55;
    h.part(`vine-${v + 1}-${k + 1}`, leaf().rotateZ(k % 2 === 0 ? 15 : -15).rotateZ((a * 180) / Math.PI + 90)
      .translate(rr * Math.cos(a), rr * Math.sin(a), z).color(leaves));
  }
}

return h.model();
