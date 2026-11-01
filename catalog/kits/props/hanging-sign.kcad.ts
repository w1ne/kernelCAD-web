// Original kernelCAD low-poly hanging shop sign: a post with a braced
// bracket arm, a board hung from two rings, and a cut-out emblem (mug,
// sword or boot) on the board instead of lettering. Millimetres, Z up,
// base on z = 0 centred on x = y = 0, sign faces -Y.

meta({
  name: 'hanging-sign',
  license: 'CC0-1.0',
  title: 'Hanging shop sign',
  description: 'Tavern or shop sign board hung from a bracket arm on a post, with a mug, sword or boot emblem. Knobs: emblem, board shape, post, iron, board and emblem colours.',
  tags: ['sign', 'hanging sign', 'shop sign', 'tavern sign', 'inn', 'shop', 'medieval', 'fantasy', 'village', 'emblem'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'medieval', 'fantasy', 'village', 'town', 'street', 'tavern'],
  triangleBudget: 240,
});

const emblem = param('emblem', 'mug', { choices: ['mug', 'sword', 'boot', 'none'], label: 'Emblem' });
const shape = param('shape', 'notched', { choices: ['notched', 'plain'], label: 'Board shape' });
const post = param('post', '#5a3e28', { label: 'Post' });
const iron = param('iron', '#2e2e30', { label: 'Bracket and rings' });
const board = param('board', '#a8302a', { label: 'Board' });
const mark = param('mark', '#e8c33a', { label: 'Emblem' });

presets({
  tavern: { emblem: 'mug', board: '#2f5a3a' },
  smithy: { emblem: 'sword', board: '#3a3a3e', mark: '#c4c8cc' },
  cobbler: { emblem: 'boot', board: '#c9a77a', mark: '#5a3a2a' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const H = 2600;
const armZ = 2350;
const armL = 900;
const hs = assembly('hanging-sign');
hs.part('post', blk(-60, -60, 0, 60, 60, H).union(blk(-110, -110, 0, 110, 110, 120)).color(post));
// Bracket: horizontal arm along +X with a diagonal brace back to the post.
const braceL = Math.hypot(380, 380);
hs.part('bracket', blk(55, -20, armZ, 60 + armL, 20, armZ + 40)
  .union(box(braceL + 30, 30, 30, true).rotateY(45).translate(60 + 190, 0, armZ - 190 + 10))
  .color(iron));
// Board hangs below the arm on two links; centred at x = bx.
const bx = 60 + armL * 0.55;
const BW = 640;
const BH = 440;
const bz = armZ - 120 - BH;
for (const sx of [-1, 1]) {
  hs.part(`ring-${sx < 0 ? 'a' : 'b'}`, blk(bx + sx * BW * 0.35 - 8, -8, bz + BH - 5, bx + sx * BW * 0.35 + 8, 8, armZ + 1).color(iron));
}
const prof: [number, number][] = shape.value === 'notched'
  ? [[-BW / 2, 0], [-BW / 2 + 60, 60], [BW / 2 - 60, 60], [BW / 2, 0], [BW / 2, BH - 40], [BW / 2 - 40, BH], [-BW / 2 + 40, BH], [-BW / 2, BH - 40]]
  : [[-BW / 2, 0], [BW / 2, 0], [BW / 2, BH], [-BW / 2, BH]];
hs.part('board', extrudePolygon(prof, 40).rotateX(90).translate(bx, 20, bz).color(board));
// Emblem: a flat cut-out on both faces of the board.
const em = (): [number, number][][] => {
  if (emblem.value === 'mug') {
    return [[[-90, 90], [60, 90], [60, 330], [-90, 330]], [[60, 140], [130, 140], [130, 290], [60, 290], [60, 250], [95, 250], [95, 180], [60, 180]]];
  }
  if (emblem.value === 'sword') {
    return [[[-200, 210], [140, 230], [200, 220], [140, 210]], [[-200, 165], [-180, 165], [-180, 275], [-200, 275]], [[-290, 205], [-200, 205], [-200, 235], [-290, 235]]];
  }
  if (emblem.value === 'boot') {
    return [[[-60, 330], [40, 330], [40, 170], [150, 130], [150, 90], [-60, 90]]];
  }
  return [];
};
em().forEach((pts, i) => {
  for (const [face, y] of [['front', -20 - 6], ['back', 20]] as [string, number][]) {
    hs.part(`emblem-${face}-${i + 1}`, extrudePolygon(pts.map(([x, z]) => [x, z] as [number, number]), 6).rotateX(90).translate(bx, y + 6, bz).color(mark));
  }
});

return hs.model();
