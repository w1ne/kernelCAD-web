// Original kernelCAD low-poly bramble: a tangle of arching blackberry canes
// that rise and droop back to the ground, with small leaves and clusters of
// ripe and unripe berries.

meta({
  name: 'bramble',
  license: 'CC0-1.0',
  title: 'Bramble',
  description: 'Blackberry bramble of arching thorny canes with small leaves and clusters of ripe and red berries, for hedgerows and overgrown forests. Knobs: size, canes, cane, leaf, ripe and unripe berry colours.',
  tags: ['bramble', 'blackberry', 'berries', 'thorns', 'briar', 'hedgerow', 'shrub', 'forest', 'overgrown', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'forest', 'meadow', 'farm', 'swamp'],
  triangleBudget: 600,
});

const size = param('size', '1', { choices: ['0.7', '1', '1.4'], label: 'Height (m)' });
const canes = param('canes', '5', { choices: ['4', '5', '6'], label: 'Canes' });
const cane = param('cane', '#7a3a3e', { label: 'Canes' });
const leaf = param('leaf', '#3f7a34', { label: 'Leaves' });
const ripe = param('ripe', '#2a1a3a', { label: 'Ripe berries' });
const unripe = param('unripe', '#c83a3a', { label: 'Unripe berries' });

presets({
  raspberry: { ripe: '#c8304a', unripe: '#f0a0a0' },
  autumn: { leaf: '#a85a2e' },
});

const h = Number(size.value) * 1000;
const n = Number(canes.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Straight cane piece from a point, tilt from vertical and azimuth; returns
// its end point. Pieces run a little past their end so joints overlap.
const piece = (name: string, from: [number, number, number], r: number, len: number, tilt: number, az: number) => {
  const t = (tilt * Math.PI) / 180;
  const a = (az * Math.PI) / 180;
  const shape = ngon(r, 4).loft(ngon(r * 0.8, 4), { spacing: len + r, ruled: true }).rotateY(tilt).rotateZ(az).translate(from[0], from[1], from[2]);
  bush.part(name, shape.color(cane));
  return [from[0] + len * Math.sin(t) * Math.cos(a), from[1] + len * Math.sin(t) * Math.sin(a), from[2] + len * Math.cos(t)] as [number, number, number];
};

const bush = assembly('bramble');
const cr = h * 0.024;
// Leafy core so the bramble reads as a thicket, not bare wire.
const R = h * 0.45;
bush.part('thicket', ngon(R * 0.8, 7).loft([ngon(R, 7, 0.45), ngon(R * 0.35, 7)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, h * 0.18] },
    { plane: 'XY', origin: [0, 0, h * 0.42] },
  ],
  ruled: true,
}).color(leaf));
const leafShape = (r: number) => extrudePolygon([[0, 0], [r * 0.45, r * 0.4], [0, r], [-r * 0.45, r * 0.4]], 6).translate(0, 0, -3);
for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + 20 * (i % 2);
  const up = h * (0.75 + 0.2 * ((i * 0.618) % 1));
  // Arch: rise steeply, bend over, then droop toward the ground. The base
  // starts above ground by the tilted cross-section's dip.
  const z0 = cr * Math.sin((30 * Math.PI) / 180);
  const p1 = piece(`cane-${i + 1}-a`, [0, 0, z0], cr, up * 0.5, 30, az);
  const p2 = piece(`cane-${i + 1}-b`, p1, cr * 0.85, up * 0.5, 80, az + 15);
  const p3 = piece(`cane-${i + 1}-c`, p2, cr * 0.7, up * 0.4, 125, az + 25);
  // Leaves at the bends, berries hanging near the tip.
  const mid1: [number, number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
  for (const [k, at] of [[0, p1], [1, p2], [2, mid1]] as const) {
    bush.part(`leaf-${i + 1}-${k + 1}`, leafShape(h * 0.17).rotateX(-60).rotateZ(az + 90 + k * 140).translate(at[0], at[1], at[2]).color(leaf));
  }
  const br = h * 0.028;
  const berry = (x: number, y: number, z: number) => ngon(br * 0.7, 4).loft([ngon(br, 4, Math.PI / 4), ngon(br * 0.4, 4)], {
    planes: [
      { plane: 'XY', origin: [x, y, z - br] },
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + br] },
    ],
    ruled: true,
  });
  const mid: [number, number, number] = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2, (p2[2] + p3[2]) / 2];
  bush.part(`berries-${i + 1}`, berry(mid[0], mid[1], mid[2] - br).color(i % 3 === 2 ? unripe : ripe));
}

return bush.model();
