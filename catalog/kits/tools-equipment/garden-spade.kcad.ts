// Original kernelCAD low-poly garden spade standing upright with its blade
// planted: a flat square digging blade or pointed shovel blade with a foot
// tread, a tapered socket, an octagonal shaft and a D or T grip.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, blade face toward -Y.

meta({
  name: 'garden-spade',
  license: 'CC0-1.0',
  title: 'Garden spade',
  description: 'Garden spade or shovel standing upright with the blade planted, square digging or pointed shovel blade, wooden shaft and D or T handle. Knobs: blade style, handle style, blade, shaft and grip colours.',
  tags: ['spade', 'shovel', 'garden', 'digging', 'gardening', 'farm', 'tool', 'item'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'garden', 'farm', 'construction', 'garage'],
  triangleBudget: 200,
});

const bladeStyle = param('bladeStyle', 'square', { choices: ['square', 'pointed'], label: 'Blade' });
const gripStyle = param('gripStyle', 'D', { choices: ['D', 'T'], label: 'Handle' });
const blade = param('blade', '#6d737a', { label: 'Blade' });
const shaft = param('shaft', '#b88a52', { label: 'Shaft' });
const grip = param('grip', '#2f6b3a', { label: 'Grip' });

presets({
  rusty: { blade: '#7a4a2e', shaft: '#8a6a45', grip: '#6a5a3a' },
  stainless: { blade: '#c9ced4', grip: '#2a2a2c' },
});

// Polygon in the XZ plane extruded through Y, centred on y = 0.
const front = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const oct = (r: number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 8), r * Math.sin(Math.PI / 8));
  for (let k = 1; k < 8; k++) p = p.lineTo(r * Math.cos(Math.PI / 8 + (Math.PI * k) / 4), r * Math.sin(Math.PI / 8 + (Math.PI * k) / 4));
  return p.close();
};
const pointed = bladeStyle.value === 'pointed';
const BW = pointed ? 230 : 190; // blade width
const BH = pointed ? 300 : 280; // blade height
const zTop = 1000;

const s = assembly('garden-spade');
// Blade with the folded foot tread across its top edge.
const bp: [number, number][] = pointed
  ? [[0, 0], [BW * 0.32, 70], [BW / 2, 190], [BW / 2, BH], [-BW / 2, BH], [-BW / 2, 190], [-BW * 0.32, 70]]
  : [[-BW / 2 + 6, 0], [BW / 2 - 6, 0], [BW / 2, 20], [BW / 2, BH], [-BW / 2, BH], [-BW / 2, 20]];
s.part('blade', front(bp, 5)
  .union(box(BW, 16, 14, true).translate(0, 0, BH - 4))
  // Tapered socket wrapping the bottom of the shaft.
  .union(oct(30).loft(oct(20), { spacing: 140, ruled: true }).translate(0, 0, BH - 10))
  .color(blade));
// Shaft from inside the socket up to the grip.
const z1 = gripStyle.value === 'D' ? zTop - 140 : zTop - 25;
s.part('shaft', oct(18).extrude(z1 + 20 - (BH + 110)).translate(0, 0, BH + 110).color(shaft));
if (gripStyle.value === 'D') {
  s.part('grip', front([[-22, 0], [22, 0], [72, 92], [76, 140], [-76, 140], [-72, 92]], 30)
    .subtract(front([[-11, 32], [11, 32], [50, 96], [50, 112], [-50, 112], [-50, 96]], 90))
    .translate(0, 0, z1).color(grip));
} else {
  s.part('grip', box(170, 34, 34, true).translate(0, 0, zTop - 17)
    .union(oct(22).extrude(60).translate(0, 0, zTop - 70)).color(grip));
}

return s.model();
