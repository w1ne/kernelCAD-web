// Original kernelCAD low-poly cardboard box pile: taped shipping boxes of a
// few sizes stacked slightly askew, with tape strips over the lid seams and
// an optional opened box with raised flaps on top.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'cardboard-boxes',
  license: 'CC0-1.0',
  title: 'Cardboard boxes',
  description: 'Pile of taped cardboard moving boxes stacked askew, optionally topped by an open box with raised flaps. Knobs: count, open top box, cardboard, tape and label colours.',
  tags: ['boxes', 'cardboard', 'cardboard boxes', 'moving boxes', 'parcels', 'packages', 'delivery', 'storage', 'warehouse'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'warehouse', 'office', 'street', 'shop'],
  triangleBudget: 460,
});

const count = param('count', '4', { choices: ['2', '3', '4', '5'], label: 'Boxes' });
const open = param('open', 'yes', { choices: ['yes', 'no'], label: 'Open top box' });
const card = param('card', '#c49563', { label: 'Cardboard' });
const tape = param('tape', '#d9c08a', { label: 'Tape' });
const label = param('label', '#f2f0ea', { label: 'Shipping labels' });

presets({
  white: { card: '#e8e4dc', tape: '#c8302a' },
  dark: { card: '#9a7048', tape: '#3a3a3a' },
});

const n = Number(count.value);
// Box sizes (x, y, z) and placement (x, y, yaw), bottom-up; each sits on the one below or the floor.
const spec: [number, number, number, number, number, number, number][] = [
  // w, d, h, x, y, yaw, onTopOf (-1 = floor)
  [600, 450, 400, -180, 0, 0, -1],
  [450, 350, 320, 360, 40, -12, -1],
  [500, 400, 350, -160, 10, 8, 0],
  [350, 300, 260, 340, 20, 15, 1],
  [380, 300, 280, -150, 0, -10, 2],
];
const tops: number[] = [];
const bx = assembly('cardboard-boxes');
for (let i = 0; i < n; i++) {
  const [w, d, h, x, y, yaw, on] = spec[i];
  const z = on < 0 ? 0 : tops[on];
  tops.push(z + h);
  const place = (sh: Shape) => sh.rotateZ(yaw).translate(x, y, z);
  const isOpen = open.value === 'yes' && i === n - 1;
  if (isOpen) {
    bx.part(`box-${i + 1}`, place(box(w, d, h, true).translate(0, 0, h / 2).subtract(box(w - 20, d - 20, h, true).translate(0, 0, h / 2 + 20))).color(card));
    // Four flaps hinged at the rim, leaning outward.
    bx.part(`flaps-${i + 1}`, place(box(w, 8, d * 0.45).translate(-w / 2, -4, 0).rotateX(-25).translate(0, -d / 2 + 4, h - 2)
      .union(box(w, 8, d * 0.45).translate(-w / 2, -4, 0).rotateX(25).translate(0, d / 2 - 4, h - 2))
      .union(box(8, d - 20, w * 0.4).translate(-4, -(d - 20) / 2, 0).rotateY(30).translate(w / 2 - 4, 0, h - 2))
      .union(box(8, d - 20, w * 0.4).translate(-4, -(d - 20) / 2, 0).rotateY(-30).translate(-w / 2 + 4, 0, h - 2))).color(card));
  } else {
    bx.part(`box-${i + 1}`, place(box(w, d, h, true).translate(0, 0, h / 2)).color(card));
    // Tape across the lid seam and down both ends.
    bx.part(`tape-${i + 1}`, place(box(w + 6, 60, 4, true).translate(0, 0, h + 1)
      .union(box(4, 60, 120, true).translate(w / 2 + 1, 0, h - 58))
      .union(box(4, 60, 120, true).translate(-w / 2 - 1, 0, h - 58))).color(tape));
    bx.part(`label-${i + 1}`, place(box(w * 0.3, 4, h * 0.3, true).translate(w * 0.15, -d / 2 - 1, h * 0.55)).color(label));
  }
}

return bx.model();
