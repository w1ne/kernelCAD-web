// Original kernelCAD low-poly village well: a round faceted stone wall with
// a capstone ring and dark water, two posts carrying a gabled shingle roof,
// a winch roller with crank and a hanging bucket.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'well',
  license: 'CC0-1.0',
  title: 'Stone well',
  description: 'Village wishing well with a round stone wall, gabled roof on two posts, winch roller with crank and a hanging bucket. Knobs: roof, stone, cap, wood, roof and water colours.',
  tags: ['well', 'wishing well', 'water', 'village', 'stone', 'medieval', 'fantasy', 'farm'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'medieval', 'fantasy', 'village', 'farm'],
  triangleBudget: 520,
});

const roof = param('roof', 'gabled', { choices: ['gabled', 'none'], label: 'Roof' });
const stone = param('stone', '#9a958c', { label: 'Stone wall' });
const cap = param('cap', '#7f7a72', { label: 'Capstones' });
const wood = param('wood', '#6e4a2c', { label: 'Wood' });
const shingles = param('shingles', '#9a3a2a', { label: 'Roof' });
const water = param('water', '#2f5f8a', { label: 'Water' });

presets({
  mossy: { stone: '#7f8a6a', cap: '#5f6a4a' },
  thatched: { shingles: '#c9a352' },
  desert: { stone: '#c9a77a', cap: '#b08d62', shingles: '#7a5a3a' },
});

const n = 12;
const R = 700;
const wallH = 750;
const ngon = (r: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const w = assembly('well');
// Wall: slightly battered (wider at the base), hollow.
w.part('wall', ngon(R + 40).loft(ngon(R), { spacing: wallH, ruled: true })
  .subtract(ngon(R - 160).extrude(wallH + 20).translate(0, 0, 200)).color(stone));
// Capstone ring: offset half a facet so the joints read as separate stones.
w.part('cap', ngon(R + 50, Math.PI / n).extrude(90).subtract(ngon(R - 180, Math.PI / n).extrude(120).translate(0, 0, -10)).translate(0, 0, wallH - 1).color(cap));
w.part('water', ngon(R - 161).extrude(20).translate(0, 0, 400).color(water));

if (roof.value === 'gabled') {
  const postH = 2100;
  for (const sx of [-1, 1]) {
    w.part(`post-${sx < 0 ? 'left' : 'right'}`, blk(sx * (R - 75) - 50, -50, 300, sx * (R - 75) + 50, 50, postH).color(wood));
  }
  // Winch roller with a crank on the right.
  const roll = (r: number, len: number, x0: number) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < 6; k++) p = p.lineTo(r * Math.cos((Math.PI * k) / 3), r * Math.sin((Math.PI * k) / 3));
    return p.close().extrude(len).rotateY(90).translate(x0, 0, 1400);
  };
  w.part('roller', roll(70, 2 * R - 180, -R + 90)
    .union(roll(20, 220, R - 100))
    .union(blk(R + 100, -15, 1400, R + 130, 15, 1620))
    .union(blk(R + 100, -60, 1600, R + 130, 15, 1630))
    .color(wood));
  w.part('rope', blk(-8, -8, 950, 8, 8, 1340).color(cap));
  w.part('bucket', ngon(130).loft(ngon(160), { spacing: 220, ruled: true }).translate(0, 0, 760).color(wood));
  // Gabled roof: two sloped slabs meeting at the ridge, overhanging.
  const ridgeZ = postH + 550;
  const half = 750;
  const slope = (Math.atan2(550, half) * 180) / Math.PI;
  const sl = Math.hypot(550, half) + 120;
  for (const sy of [-1, 1]) {
    w.part(`roof-${sy < 0 ? 'front' : 'back'}`, box(2 * R + 500, sl, 60, true)
      .rotateX(-sy * slope).translate(0, sy * (sl / 2) * Math.cos((slope * Math.PI) / 180) - sy * 40, ridgeZ - (sl / 2) * Math.sin((slope * Math.PI) / 180)).color(shingles));
  }
  // Gable frame: beam across the post tops and a ridge post.
  w.part('beam', blk(-R - 40, -60, postH - 1, R + 40, 60, postH + 100).color(wood));
  for (const sx of [-1, 1]) {
    w.part(`king-post-${sx < 0 ? 'left' : 'right'}`, blk(sx * (R - 70) - 30, -30, postH + 99, sx * (R - 70) + 30, 30, ridgeZ - 30).color(wood));
  }
}

return w.model();
