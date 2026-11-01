// Original kernelCAD low-poly adjustable wrench lying flat as a pickup item: a
// tapered handle with a hang hole, a fixed and a sliding jaw and the knurled
// worm screw between them. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, handle along X with the jaws opening toward +X.

meta({
  name: 'adjustable-wrench',
  license: 'CC0-1.0',
  title: 'Adjustable wrench',
  description: 'Adjustable spanner lying flat as a pickup or workshop prop, with fixed and sliding jaws, worm screw and a bare or rubber-dipped handle. Knobs: size, grip, steel, screw and grip colours.',
  tags: ['wrench', 'adjustable wrench', 'spanner', 'crescent wrench', 'tool', 'hand tool', 'plumbing', 'mechanic', 'item', 'pickup'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 280,
});

const size = param('size', '10in', { choices: ['6in', '10in', '12in'], label: 'Size' });
const gripStyle = param('gripStyle', 'dipped', { choices: ['bare', 'dipped'], label: 'Handle grip' });
const steel = param('steel', '#a9afb6', { label: 'Steel' });
const screw = param('screw', '#4a4f56', { label: 'Worm screw' });
const grip = param('grip', '#c8322a', { label: 'Grip' });

presets({
  blue: { grip: '#2d5ea8' },
  black: { steel: '#3b3e43', screw: '#a9afb6', grip: '#d9a21b' },
});

const s = size.value === '6in' ? 0.6 : size.value === '12in' ? 1.2 : 1;
const P = (pts: [number, number][]) => pts.map(([x, y]) => [x * s, y * s] as [number, number]);
const HT = 14 * s; // head thickness
const ht = 8 * s; // handle thickness
const zc = HT / 2;

const a = assembly('adjustable-wrench');
// Handle: tapered bar with a cut end, a hexagonal hang hole near the butt.
let body = extrudePolygon(P([[-125, -9], [-118, -12], [60, -15], [60, 15], [-118, 12], [-125, 9]]), ht)
  .translate(0, 0, zc - ht / 2)
  .subtract(cylinder(HT, 5 * s, 6).translate(-110 * s, 0, 0));
// Fixed jaw and head body (the upper jaw, +Y side), with the jaw slot open to +X.
body = body.union(extrudePolygon(P([[45, -14], [70, -30], [92, -30], [92, 9], [132, 13], [134, 24], [118, 34], [84, 34], [56, 18]]), HT))
  // Window through the head that shows the worm screw.
  .subtract(box(26 * s, 14 * s, HT * 3, true).translate(77 * s, -21 * s, 0));
a.part('steel', body.color(steel));
// Sliding jaw below the slot, riding in the head.
a.part('jaw', extrudePolygon(P([[90, -26], [128, -26], [134, -15], [132, -7], [91, -7]]), HT - 2 * s)
  .translate(0, 0, s).color(steel));
// Knurled worm screw: an octagonal roller across the head, proud of both faces.
a.part('screw', cylinder(30 * s, 7 * s, 8).rotateY(90).translate(62 * s, -20 * s, zc).color(screw));
if (gripStyle.value === 'dipped') {
  a.part('grip', extrudePolygon(P([[-127, -11], [-118, -14], [20, -16], [20, 16], [-118, 14], [-127, 11]]), ht + 3 * s)
    .translate(0, 0, zc - (ht + 3 * s) / 2)
    .subtract(cylinder(HT, 5 * s, 6).translate(-110 * s, 0, 0)).color(grip));
}

return a.model();
