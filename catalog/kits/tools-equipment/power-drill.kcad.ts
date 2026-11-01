// Original kernelCAD low-poly cordless drill standing upright on its battery
// pack: a slanted rubber pistol grip, motor housing, trigger, faceted chuck
// and a drill or driver bit. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, chuck pointing +X.

meta({
  name: 'power-drill',
  license: 'CC0-1.0',
  title: 'Cordless power drill',
  description: 'Cordless drill-driver standing on its battery with pistol grip, trigger, keyless chuck and a drill or screwdriver bit. Knobs: battery size, bit, body, trim, chuck and bit colours.',
  tags: ['drill', 'power drill', 'cordless drill', 'drill driver', 'power tool', 'tool', 'diy', 'construction', 'item'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 220,
});

const battery = param('battery', 'standard', { choices: ['compact', 'standard', 'extended'], label: 'Battery' });
const bit = param('bit', 'drill', { choices: ['drill', 'driver', 'none'], label: 'Bit' });
const body = param('body', '#e8b21c', { label: 'Body' });
const trim = param('trim', '#2a2a2d', { label: 'Grip and battery' });
const chuck = param('chuck', '#3d4045', { label: 'Chuck' });
const steel = param('steel', '#c3c8ce', { label: 'Bit' });

presets({
  green: { body: '#2f8a4a' },
  red: { body: '#c8322a', trim: '#1f1f21' },
  teal: { body: '#1f8a9a', trim: '#3a3c40' },
});

const BH = battery.value === 'compact' ? 42 : battery.value === 'extended' ? 80 : 60; // battery height
const W = 60; // housing width (Y)
const X0 = -60; // shift so the whole drill is centred on x = 0
const side = (pts: [number, number][], w: number) =>
  extrudePolygon(pts.map(([x, z]) => [x + X0, z + BH] as [number, number]), w).rotateX(90).translate(0, w / 2, 0);

const d = assembly('power-drill');
// Battery pack with a housing collar above it.
d.part('battery', box(110, 84, BH).translate(-80 + X0, -42, 0).color(trim));
// Grip leaning back toward the top, narrower than the housing.
d.part('grip', side([[-62, -4], [6, -4], [-12, 128], [-76, 128]], 44).color(trim));
// Motor housing: foot collar on the battery and the main barrel over the grip.
d.part('collar', side([[-104, -6], [32, -6], [26, 12], [-98, 12]], W - 4).color(body));
d.part('housing', side([[-108, 145], [-82, 120], [72, 124], [96, 136], [96, 190], [72, 202], [-86, 202], [-108, 186]], W)
  .color(body));
d.part('trigger', side([[-14, 86], [8, 92], [8, 120], [-20, 120]], 16).color(body));
// Keyless chuck: octagonal frustum along +X.
const oct = (r: number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 8), r * Math.sin(Math.PI / 8));
  for (let k = 1; k < 8; k++) p = p.lineTo(r * Math.cos(Math.PI / 8 + (Math.PI * k) / 4), r * Math.sin(Math.PI / 8 + (Math.PI * k) / 4));
  return p.close();
};
const zc = BH + 163;
d.part('chuck', oct(27).loft([oct(26), oct(17)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, 34] },
    { plane: 'XY', origin: [0, 0, 60] },
  ],
  ruled: true,
}).rotateY(90).translate(90 + X0, 0, zc).color(chuck));
if (bit.value !== 'none') {
  const len = bit.value === 'drill' ? 90 : 40;
  const r = bit.value === 'drill' ? 4.5 : 3.5;
  let b = oct(r).extrude(len).rotateY(90).translate(145 + X0, 0, zc);
  if (bit.value === 'drill') b = b.union(oct(r * 0.9).loft(oct(1.5), { spacing: 12, ruled: true }).rotateY(90).translate(143 + X0 + len, 0, zc));
  else b = b.union(box(10, 7, 2, true).translate(149 + X0 + len, 0, zc));
  d.part('bit', b.color(steel));
}

return d.model();
