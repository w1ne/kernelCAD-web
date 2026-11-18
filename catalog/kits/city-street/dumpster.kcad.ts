// Original kernelCAD low-poly dumpster: a steel waste skip with a sloped
// front, two lids, side lifting pockets, a reinforcing rib and four casters.
// Millimetres, Z up, sloped front faces -Y.

meta({
  name: 'dumpster',
  license: 'CC0-1.0',
  title: 'Dumpster',
  description: 'Commercial waste dumpster with a sloped front, two lids, lifting pockets and casters. Knobs: lids open or closed, body, lid and caster colours.',
  tags: ['dumpster', 'skip', 'waste container', 'trash', 'garbage', 'bin', 'alley', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'alley', 'industrial'],
  triangleBudget: 320,
});

const lids = param('lids', 'closed', { choices: ['closed', 'one open'], label: 'Lids' });
const body = param('body', '#2f6b4a', { label: 'Body' });
const lid = param('lid', '#1e1e1e', { label: 'Lids' });
const caster = param('caster', '#4a4d52', { label: 'Casters and pockets' });

presets({
  blue: { body: '#2a5ea8' },
  rusty: { body: '#8a4a2a', lid: '#3a3c3f' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const L = 1800;
const top = 1200;
const dm = assembly('dumpster');
dm.part('body', sideProfile([[-450, 150], [560, 150], [600, top], [-640, top]], -L / 2, L).color(body));
dm.part('rim', sideProfile([[-660, top - 80], [620, top - 80], [620, top], [-660, top]], -L / 2 - 20, L + 40).color(body));
dm.part('skid', blk(-L / 2 + 60, -400, 100, L / 2 - 60, 500, 160).color(caster));
for (const side of [-1, 1]) {
  dm.part(`pocket-${side < 0 ? 'l' : 'r'}`, blk(side * (L / 2) - 60, -200, 750, side * (L / 2) + 60, 200, 900).color(caster));
}
dm.part('lid-left', blk(-L / 2 - 20, -660, top, -10, 640, top + 40).color(lid));
if (lids.value === 'closed') {
  dm.part('lid-right', blk(10, -660, top, L / 2 + 20, 640, top + 40).color(lid));
} else {
  dm.part('lid-right', box(L / 2 + 10, 40, 1300).translate(10, 640, top).rotateX(-8).color(lid));
}
for (const [k, [px, py]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  const x = px * (L / 2 - 180);
  const y = py * 320 + 50;
  dm.part(`caster-${k + 1}`, ngon(55, 8).extrude(40).translate(0, 0, -20).rotateY(90).translate(x, y, 55).color(caster));
  dm.part(`fork-${k + 1}`, blk(x - 35, y - 30, 50, x + 35, y + 30, 110).color(caster));
}

return dm.model();
