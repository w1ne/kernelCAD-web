// Original kernelCAD low-poly wooden signpost: a square post with arrow-
// pointed finger boards at different heights and angles and a small cap,
// on a stone-wedged base. Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'signpost',
  license: 'CC0-1.0',
  title: 'Wooden signpost',
  description: 'Crossroads signpost with arrow-shaped finger boards pointing different ways, a pyramid cap and a stone footing. Knobs: arrow count, post, board and footing colours.',
  tags: ['signpost', 'sign', 'direction', 'crossroads', 'wayfinding', 'arrow', 'medieval', 'trail', 'village'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'medieval', 'fantasy', 'forest', 'village', 'trail'],
  triangleBudget: 240,
});

const arrows = param('arrows', '3', { choices: ['1', '2', '3', '4'], label: 'Arrows' });
const post = param('post', '#6e4a2c', { label: 'Post' });
const boards = param('boards', '#c49a5c', { label: 'Boards' });
const footing = param('footing', '#8a8d91', { label: 'Footing stones' });

presets({
  painted: { boards: '#efe9dc', post: '#3a5a3a' },
  old: { boards: '#9a8a70', post: '#5a4a3a' },
});

const n = Number(arrows.value);
const H = 2300;
const pw = 110;

const s = assembly('signpost');
s.part('post', box(pw, pw, H, true).translate(0, 0, H / 2)
  .union(path().moveTo(-pw / 2 - 15, -pw / 2 - 15).lineTo(pw / 2 + 15, -pw / 2 - 15).lineTo(pw / 2 + 15, pw / 2 + 15).lineTo(-pw / 2 - 15, pw / 2 + 15).close()
    .loft(path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close(), { spacing: 140, ruled: true }).translate(0, 0, H - 1))
  .color(post));
// Footing: a few chunky stones wedged around the foot of the post.
for (let i = 0; i < 4; i++) {
  const a = 90 * i + 25;
  s.part(`stone-${i + 1}`, path().moveTo(-90, -70).lineTo(90, -60).lineTo(80, 70).lineTo(-80, 65).close()
    .loft(path().moveTo(-45, -30).lineTo(40, -35).lineTo(40, 30).lineTo(-40, 35).close(), { spacing: 110, ruled: true })
    .translate(150, 0, 0).rotateZ(a).color(footing));
}
// Finger boards: arrow outline, pointing outward from the post.
const yaws = [20, 160, 75, 250];
for (let i = 0; i < n; i++) {
  const L = 700 - 60 * (i % 2);
  const bh = 160;
  const z = H - 220 - i * 230;
  const arrow = extrudePolygon([[0, -bh / 2], [L - 120, -bh / 2], [L, 0], [L - 120, bh / 2], [0, bh / 2]], 35)
    .rotateX(90).translate(-60, 17, z - 0).rotateZ(yaws[i]);
  s.part(`board-${i + 1}`, arrow.color(boards));
}

return s.model();
