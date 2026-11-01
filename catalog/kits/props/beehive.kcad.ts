// Original kernelCAD low-poly beehive: either a stacked wooden box hive
// (floor, entrance, supers and a gabled roof on a stand) or a classic
// domed straw skep on a wooden stool. Millimetres, Z up, base on z = 0
// centred on x = y = 0, entrance towards -Y.

meta({
  name: 'beehive',
  license: 'CC0-1.0',
  title: 'Beehive',
  description: 'Wooden box beehive with stacked supers and gabled roof on a stand, or a domed straw skep on a stool. Knobs: style, supers, box, roof, stand and entrance colours.',
  tags: ['beehive', 'hive', 'bees', 'apiary', 'honey', 'skep', 'farm', 'garden'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'farm', 'garden', 'meadow', 'medieval'],
  triangleBudget: 440,
});

const style = param('style', 'box', { choices: ['box', 'skep'], label: 'Style' });
const supers = param('supers', '3', { choices: ['2', '3', '4'], label: 'Box supers' });
const boxC = param('boxC', '#e8d9a8', { label: 'Hive body' });
const roof = param('roof', '#9a9ea3', { label: 'Roof' });
const stand = param('stand', '#7a5534', { label: 'Stand' });
const entrance = param('entrance', '#2a2420', { label: 'Entrance' });

presets({
  painted: { boxC: '#7fa8c8', roof: '#e8e4dc' },
  yellow: { boxC: '#e8c33a' },
  skep: { style: 'skep', boxC: '#c9a352', stand: '#6e4a2c' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const h = assembly('beehive');
if (style.value === 'box') {
  const W = 500;
  const D = 420;
  const sh = 180;
  const z0 = 300;
  for (const [i, [x, y]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) {
    h.part(`leg-${i + 1}`, blk(x * (W / 2 - 30) - 30, y * (D / 2 - 30) - 30, 0, x * (W / 2 - 30) + 30, y * (D / 2 - 30) + 30, z0 + 1).color(stand));
  }
  // Floor with a landing board sticking out the front.
  h.part('floor', blk(-W / 2 - 10, -D / 2 - 90, z0, W / 2 + 10, D / 2 + 10, z0 + 50).color(stand));
  const ns = Number(supers.value);
  for (let i = 0; i < ns; i++) {
    const z = z0 + 50 + i * sh;
    // Each super is a hair narrower than its lip so the joints read.
    h.part(`super-${i + 1}`, blk(-W / 2, -D / 2, z, W / 2, D / 2, z + sh - 12).union(blk(-W / 2 - 8, -D / 2 - 8, z + sh - 13, W / 2 + 8, D / 2 + 8, z + sh)).color(boxC));
  }
  const top = z0 + 50 + ns * sh;
  h.part('entrance', blk(-W * 0.3, -D / 2 - 4, z0 + 50, W * 0.3, -D / 2 + 20, z0 + 75).color(entrance));
  h.part('roof', blk(-W / 2 - 30, -D / 2 - 30, top - 1, W / 2 + 30, D / 2 + 30, top + 40)
    .union(extrudePolygon([[-D / 2 - 30, 0], [D / 2 + 30, 0], [0, 110]], W + 60).rotateX(90).rotateZ(90).translate(-W / 2 - 30, 0, top + 39))
    .color(roof));
} else {
  // Stool: round top on three legs.
  const ngon = (r: number, n: number) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
    return p.close();
  };
  const z0 = 450;
  for (let i = 0; i < 3; i++) {
    h.part(`leg-${i + 1}`, ngon(30, 5).extrude(z0 + 10).rotateY(8).translate(200, 0, 30 * Math.sin((8 * Math.PI) / 180)).rotateZ(120 * i + 90).color(stand));
  }
  h.part('stool', ngon(300, 10).extrude(45).translate(0, 0, z0).color(stand));
  // Skep: stacked straw coils, each ring slightly smaller, then a cap.
  const rings = [260, 255, 240, 215, 180, 130];
  rings.forEach((r, i) => {
    h.part(`coil-${i + 1}`, ngon(r, 12).loft(ngon(r - 18, 12), { spacing: 72, ruled: true }).translate(0, 0, z0 + 44 + i * 68).color(boxC));
  });
  h.part('cap', ngon(105, 12).loft(ngon(30, 12), { spacing: 60, ruled: true }).translate(0, 0, z0 + 44 + rings.length * 68 - 4).color(boxC));
  h.part('entrance', extrudePolygon([[-70, 0], [70, 0], [40, 60], [-40, 60]], 30).rotateX(90).translate(0, -250, z0 + 44).color(entrance));
}

return h.model();
