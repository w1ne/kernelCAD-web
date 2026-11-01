// Original kernelCAD low-poly cauldron: a pot-bellied faceted iron pot on
// three stubby legs with a thick rim, two side lugs, bubbling brew and an
// optional log fire underneath. Millimetres, Z up, base on z = 0 centred on
// x = y = 0.

meta({
  name: 'cauldron',
  license: 'CC0-1.0',
  title: 'Cauldron',
  description: 'Pot-bellied witch cauldron on three legs with a thick rim, side lugs and bubbling brew, optionally over crossed logs. Knobs: fire, size, iron, brew and wood colours.',
  tags: ['cauldron', 'pot', 'witch', 'potion', 'brew', 'magic', 'fantasy', 'medieval', 'cooking'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'fantasy', 'medieval', 'camp', 'dungeon'],
  triangleBudget: 460,
});

const fire = param('fire', 'none', { choices: ['none', 'logs'], label: 'Fire underneath' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const iron = param('iron', '#2e2f33', { label: 'Iron' });
const brew = param('brew', '#5ad04a', { label: 'Brew' });
const wood = param('wood', '#6e4a2c', { label: 'Logs' });

presets({
  soup: { brew: '#c9893a' },
  potion: { brew: '#a04ad8' },
  lava: { brew: '#f06a1e', iron: '#3a2a26' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.5 : 1;
const n = 12;
const ngon = (r: number, k0 = n, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};

const z0 = (fire.value === 'logs' ? 200 : 90) * s; // belly bottom height
const R = 330 * s;
const c = assembly('cauldron');
// Belly: rings from a narrow bottom out to the widest point and back in.
const zs = [0, 0.15, 0.45, 0.8, 0.92].map((f) => z0 + f * 560 * s);
const rs = [R * 0.45, R * 0.85, R, R * 0.86, R * 0.8];
c.part('pot', ngon(rs[0]).loft(rs.slice(1).map((r) => ngon(r)), {
  planes: zs.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
}).union(ngon(R * 0.92).extrude(50 * s).translate(0, 0, zs[4] - 5 * s))
  .subtract(ngon(R * 0.74).extrude(200 * s).translate(0, 0, zs[3]))
  .color(iron));
// Legs: three tapered stubs splayed under the belly.
for (let i = 0; i < 3; i++) {
  const a = (360 * i) / 3 + 30;
  c.part(`leg-${i + 1}`, ngon(45 * s, 4).loft(ngon(25 * s, 4), { spacing: z0 + 60 * s, ruled: true })
    .translate(R * 0.5, 0, 0).rotateZ(a).color(iron));
}
// Lugs on two sides under the rim.
for (const sx of [-1, 1]) {
  c.part(`lug-${sx < 0 ? 'left' : 'right'}`, box(90 * s, 50 * s, 60 * s, true).translate(sx * R * 0.86, 0, zs[3]).color(iron));
}
// Brew surface with a few bubbles.
c.part('brew', ngon(R * 0.745).extrude(20 * s).translate(0, 0, zs[4] - 30 * s)
  .union(ngon(45 * s, 6).loft(ngon(15 * s, 6), { spacing: 40 * s, ruled: true }).translate(R * 0.3, R * 0.1, zs[4] - 11 * s))
  .union(ngon(30 * s, 6).loft(ngon(10 * s, 6), { spacing: 28 * s, ruled: true }).translate(-R * 0.25, -R * 0.3, zs[4] - 11 * s))
  .color(brew));
if (fire.value === 'logs') {
  for (let i = 0; i < 3; i++) {
    c.part(`log-${i + 1}`, ngon(45 * s, 6).extrude(R * 2.2).translate(0, 0, -R * 1.1).rotateY(90).rotateZ(60 * i + 15).translate(0, 0, 45 * s + i * 50 * s).color(wood));
  }
}

return c.model();
