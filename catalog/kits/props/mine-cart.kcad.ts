// Original kernelCAD low-poly mine cart on a short length of track: a
// flared steel tub (a ruled loft hollowed by a smaller loft) with corner
// straps and a rim band, on four flanged wheels sitting on two rails over
// wooden sleepers, optionally heaped with ore. Millimetres, Z up, base on
// z = 0 centred on x = y = 0, track along Y.

meta({
  name: 'mine-cart',
  license: 'CC0-1.0',
  title: 'Mine cart',
  description: 'Steel mine cart on a straight track segment with sleepers, empty or heaped with ore or gold. Knobs: load, track, cart, band, wheel and rail, sleeper and ore colours.',
  tags: ['mine cart', 'minecart', 'tub', 'ore', 'mine', 'mining', 'rails', 'track', 'dwarf', 'fantasy', 'cave'],
  kit: 'props',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'mine', 'cave', 'fantasy', 'industrial', 'western'],
  triangleBudget: 420,
});

const load = param('load', 'ore', { choices: ['empty', 'ore'], label: 'Load' });
const track = param('track', 'yes', { choices: ['yes', 'no'], label: 'Track segment' });
const cart = param('cart', '#7a5a3a', { label: 'Cart tub' });
const band = param('band', '#3d3f42', { label: 'Bands' });
const steel = param('steel', '#6a6e73', { label: 'Wheels and rails' });
const sleeper = param('sleeper', '#5a3e28', { label: 'Sleepers' });
const ore = param('ore', '#e8b830', { label: 'Ore' });

presets({
  coal: { ore: '#2a2a2c' },
  crystal: { ore: '#5ad0e8', cart: '#4a4e53' },
  rusty: { cart: '#8a4f2c', band: '#5a3a26' },
});

const hasTrack = track.value === 'yes';
const gauge = 600;
const railH = hasTrack ? 140 : 0; // rail top height (sleeper + rail)
const R = 130;
const wheelZ = railH + R;

const rect = (x: number, y: number) => path().moveTo(-x / 2, -y / 2).lineTo(x / 2, -y / 2).lineTo(x / 2, y / 2).lineTo(-x / 2, y / 2).close();
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const mc = assembly('mine-cart');
if (hasTrack) {
  const TL = 2400;
  for (let i = 0; i < 5; i++) {
    const y = -TL / 2 + 200 + (i * (TL - 400)) / 4;
    mc.part(`sleeper-${i + 1}`, blk(-gauge / 2 - 250, y - 80, 0, gauge / 2 + 250, y + 80, 80).color(sleeper));
  }
  for (const sx of [-1, 1]) {
    // Rail: foot and head as one I-ish section.
    mc.part(`rail-${sx < 0 ? 'left' : 'right'}`, blk(sx * gauge / 2 - 35, -TL / 2, 79, sx * gauge / 2 + 35, TL / 2, 100)
      .union(blk(sx * gauge / 2 - 15, -TL / 2, 99, sx * gauge / 2 + 15, TL / 2, railH)).color(steel));
  }
}
// Wheels: octagons with a flange, inside the rails' top.
const tubZ = wheelZ + 40;
for (const [i, y] of [[1, -330], [2, 330]] as [number, number][]) {
  mc.part(`axle-${i}`, blk(-gauge / 2 - 40, y - 25, wheelZ - 25, gauge / 2 + 40, y + 25, tubZ + 1).color(band));
  for (const sx of [-1, 1]) {
    let p = path().moveTo(R * Math.cos(Math.PI / 8), R * Math.sin(Math.PI / 8));
    for (let k = 1; k < 8; k++) p = p.lineTo(R * Math.cos(Math.PI / 8 + (Math.PI * k) / 4), R * Math.sin(Math.PI / 8 + (Math.PI * k) / 4));
    const r0 = R * Math.cos(Math.PI / 8);
    mc.part(`wheel-${i}-${sx < 0 ? 'left' : 'right'}`, p.close().extrude(60).rotateY(90).translate(sx * gauge / 2 - 30, y, railH + r0).color(steel));
  }
}
// Tub: flared upward, hollow, with a rim band and corner straps.
const H = 520;
mc.part('tub', rect(760, 1000).loft(rect(980, 1300), { spacing: H, ruled: true })
  .subtract(rect(700, 940).loft(rect(920, 1240), { spacing: H, ruled: true }).translate(0, 0, 50))
  .translate(0, 0, tubZ).color(cart));
mc.part('rim', rect(1010, 1330).extrude(60).subtract(rect(930, 1250).extrude(100).translate(0, 0, -20)).translate(0, 0, tubZ + H - 50).color(band));
for (const [k, sx] of [[1, -1], [2, 1]] as [number, number][]) {
  // A vertical strap up the middle of each long side, following the flare.
  const lean = (Math.atan2(110, H) * 180) / Math.PI;
  mc.part(`strap-${k}`, box(30, 90, H + 10, true).rotateY(sx * lean).translate(sx * (435 + 15), 0, tubZ + H / 2).color(band));
}
if (load.value === 'ore') {
  // Heap of ore: a faceted mound plus two lumps poking out.
  const zt = tubZ + H - 30;
  mc.part('ore', rect(920, 1240).loft(rect(400, 600), { spacing: 160, ruled: true }).translate(0, 0, zt - 60)
    .union(path().moveTo(-120, -80).lineTo(110, -100).lineTo(140, 90).lineTo(-90, 120).close().loft(rect(60, 60), { spacing: 160, ruled: true }).rotateZ(25).translate(120, -200, zt + 80))
    .color(ore));
}

return mc.model();
