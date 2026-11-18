// Original kernelCAD low-poly pliers lying flat as a pickup item: closed
// steel jaws (blunt combination or long needle nose) on a riveted pivot and
// two splayed handles with dipped grips. Millimetres, Z up, base on z = 0
// centred on x = y = 0, jaws pointing +X.

meta({
  name: 'pliers',
  license: 'CC0-1.0',
  title: 'Pliers',
  description: 'Pliers lying flat as a pickup or workshop prop: combination or needle-nose steel jaws on a riveted pivot with splayed dipped handle grips. Knobs: style, steel, grip and rivet colours.',
  tags: ['pliers', 'needle nose pliers', 'combination pliers', 'tool', 'hand tool', 'electrician', 'workshop', 'item', 'pickup'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 200,
});

const style = param('style', 'combination', { choices: ['combination', 'needle-nose'], label: 'Style' });
const steel = param('steel', '#8f969e', { label: 'Steel' });
const grip = param('grip', '#d0342a', { label: 'Grips' });
const rivet = param('rivet', '#c9ced4', { label: 'Pivot rivet' });

presets({
  electrician: { grip: '#e8b21c' },
  blue: { grip: '#2f5fa8', steel: '#3d4148' },
});

const needle = style.value === 'needle-nose';
const T = 16; // grip thickness, the steel sits inside it
const xs = needle ? -10 : 20; // shift that centres the tool on x = 0
// Quad band around the segment p0 -> p1 with end widths w0, w1.
const band = (p0: [number, number], p1: [number, number], w0: number, w1: number): [number, number][] => {
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const l = Math.hypot(dx, dy);
  const nx = -dy / l;
  const ny = dx / l;
  return [
    [p0[0] - (nx * w0) / 2 + xs, p0[1] - (ny * w0) / 2], [p1[0] - (nx * w1) / 2 + xs, p1[1] - (ny * w1) / 2],
    [p1[0] + (nx * w1) / 2 + xs, p1[1] + (ny * w1) / 2], [p0[0] + (nx * w0) / 2 + xs, p0[1] + (ny * w0) / 2],
  ];
};
const X = (pts: [number, number][]) => pts.map(([x, y]) => [x + xs, y] as [number, number]);

const p = assembly('pliers');
// Jaws and pivot boss, with the jaw parting line cut from the nose back.
const jaw: [number, number][] = needle
  ? [[-22, -15], [10, -15], [55, -6], [112, -2], [115, 0], [112, 2], [55, 6], [10, 15], [-22, 15]]
  : [[-22, -15], [12, -17], [45, -12], [72, -6], [78, 0], [72, 6], [45, 12], [12, 17], [-22, 15]];
let st = extrudePolygon(X(jaw), 12).translate(0, 0, 2)
  .subtract(box(150, 2, 40, true).translate(xs + 20 + 75, 0, 0));
// Steel handle cores splaying out from the pivot.
for (const sy of [-1, 1]) {
  st = st.union(extrudePolygon(band([-5, sy * 3], [-165, sy * 36], 14, 11), 12).translate(0, 0, 2));
}
p.part('steel', st.color(steel));
for (const sy of [-1, 1]) {
  p.part(sy < 0 ? 'grip-right' : 'grip-left', extrudePolygon(band([-48, sy * 12], [-178, sy * 39], 20, 18), T).color(grip));
}
p.part('rivet', cylinder(T + 1, 8, 8).translate(xs, 0, 0).color(rivet));

return p.model();
