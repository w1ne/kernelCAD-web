// Original kernelCAD low-poly garden tool rack: a free-standing wooden frame
// on feet with a slotted top rail, holding a shovel, a pitchfork, a rake and
// a pickaxe standing on their heads. Millimetres, Z up, base on z = 0
// centred on x = y = 0, faces -Y.

meta({
  name: 'tool-rack',
  license: 'CC0-1.0',
  title: 'Tool rack',
  description: 'Free-standing wooden rack holding a shovel, pitchfork, rake and pickaxe, for farms, gardens, mines and workshops. Knobs: tool count, frame, handle and metal colours.',
  tags: ['tool rack', 'tools', 'shovel', 'spade', 'pitchfork', 'rake', 'pickaxe', 'garden', 'farm', 'mine', 'shed'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'farm', 'garden', 'mine', 'workshop', 'medieval'],
  triangleBudget: 420,
});

const tools = param('tools', '4', { choices: ['2', '3', '4'], label: 'Tools' });
const frame = param('frame', '#6e4a2c', { label: 'Rack frame' });
const handle = param('handle', '#c49a5c', { label: 'Tool handles' });
const metal = param('metal', '#6a6e73', { label: 'Tool heads' });

presets({
  rusty: { metal: '#8a5a3a' },
  painted: { frame: '#3f6a3a', metal: '#4a4e53' },
});

const n = Number(tools.value);
const W = 1300;
const railZ = 1150;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const t = assembly('tool-rack');
for (const sx of [-1, 1]) {
  const nm = sx < 0 ? 'left' : 'right';
  t.part(`post-${nm}`, blk(sx * W / 2 - 40, -40, 0, sx * W / 2 + 40, 40, railZ + 120).color(frame));
  t.part(`foot-${nm}`, blk(sx * W / 2 - 50, -300, 0, sx * W / 2 + 50, 300, 70).color(frame));
}
t.part('top-rail', blk(-W / 2 - 40, -60, railZ, W / 2 + 40, 60, railZ + 60).color(frame));
t.part('low-rail', blk(-W / 2 + 39, 60, 300, W / 2 - 39, 110, 360).color(frame));

// Each tool: haft from its head on the floor up through the rail, leaning back a little.
const hz = railZ + 260; // haft top
const haft = (x: number, z0: number) => box(36, 36, hz - z0, true).translate(x, 0, (hz + z0) / 2);
const xs = [-W * 0.36, -W * 0.12, W * 0.12, W * 0.36];
const kinds = ['shovel', 'pitchfork', 'rake', 'pickaxe'];
for (let i = 0; i < n; i++) {
  const x = xs[i] + (4 - n) * W * 0.06;
  const k = kinds[i];
  if (k === 'shovel') {
    t.part('shovel-handle', haft(x, 300).union(blk(x - 70, -18, hz - 20, x + 70, 18, hz + 20)).color(handle));
    t.part('shovel-blade', extrudePolygon([[x - 120, 300], [x + 120, 300], [x + 110, 60], [x, 0], [x - 110, 60]], 14).rotateX(90).translate(0, 7, 0).color(metal));
  } else if (k === 'pitchfork') {
    t.part('pitchfork-handle', haft(x, 330).color(handle));
    let fork = blk(x - 110, -15, 300, x + 110, 15, 340);
    for (const dx of [-95, 0, 95]) fork = fork.union(blk(x + dx - 9, -9, 0, x + dx + 9, 9, 301));
    t.part('pitchfork-tines', fork.color(metal));
  } else if (k === 'rake') {
    t.part('rake-handle', haft(x, 70).color(handle));
    let rake = blk(x - 200, -20, 40, x + 200, 20, 80);
    for (let j = 0; j < 7; j++) rake = rake.union(blk(x - 180 + j * 60 - 7, -7, 0, x - 180 + j * 60 + 7, 7, 41));
    t.part('rake-head', rake.color(metal));
  } else {
    t.part('pickaxe-handle', haft(x, 60).color(handle));
    // Curved pick: two tapered prongs from a central eye, in the XZ plane.
    t.part('pickaxe-head', extrudePolygon([[x - 280, 120], [x - 120, 30], [x - 25, 0], [x + 25, 0], [x + 120, 30], [x + 280, 120], [x + 110, 80], [x + 25, 90], [x - 25, 90], [x - 110, 80]], 40)
      .rotateX(90).translate(0, 20, 0).color(metal));
  }
}

return t.model();
