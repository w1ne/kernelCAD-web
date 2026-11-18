// Original kernelCAD low-poly notice board: a framed plank board on two
// posts under a small pitched roof, pinned with paper notices and a wanted
// poster. Millimetres, Z up, base on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'notice-board',
  license: 'CC0-1.0',
  title: 'Notice board',
  description: 'Village notice or quest board on two posts with a small pitched roof and pinned paper notices. Knobs: width, notice count, roof, wood, board, roof and paper colours.',
  tags: ['notice board', 'quest board', 'bulletin board', 'sign', 'village', 'town', 'medieval', 'fantasy', 'wanted'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'medieval', 'fantasy', 'village', 'town', 'western'],
  triangleBudget: 360,
});

const widthM = param('widthM', '1.5', { choices: ['1', '1.5', '2'], label: 'Width (m)' });
const notices = param('notices', '5', { choices: ['3', '5', '7'], label: 'Notices' });
const hasRoof = param('roof', 'yes', { choices: ['yes', 'no'], label: 'Roof' });
const wood = param('wood', '#6e4a2c', { label: 'Posts and frame' });
const board = param('board', '#b08050', { label: 'Board' });
const roofC = param('roofC', '#8a3a2a', { label: 'Roof' });
const paper = param('paper', '#efe6cc', { label: 'Paper notices' });

presets({
  weathered: { wood: '#5a4a3a', board: '#9a8a70', roofC: '#5a5e63' },
  green: { roofC: '#3f6a3a' },
});

const W = Number(widthM.value) * 1000;
const n = Number(notices.value);
const bz0 = 900;
const bz1 = 1800;
const pw = 110;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const nb = assembly('notice-board');
for (const sx of [-1, 1]) {
  nb.part(`post-${sx < 0 ? 'left' : 'right'}`, blk(sx * (W / 2 + pw / 2) - pw / 2, -pw / 2, 0, sx * (W / 2 + pw / 2) + pw / 2, pw / 2, 2150).color(wood));
}
nb.part('board', blk(-W / 2 - 1, -20, bz0, W / 2 + 1, 20, bz1).color(board));
nb.part('frame-top', blk(-W / 2, -40, bz1 - 1, W / 2, 40, bz1 + 60).color(wood));
nb.part('frame-bottom', blk(-W / 2, -40, bz0 - 60, W / 2, 40, bz0 + 1).color(wood));
// Notices: paper sheets of a few sizes, slightly rotated, pinned to the front.
for (let i = 0; i < n; i++) {
  const cols = Math.ceil(n / 2);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const pw2 = 210 + 40 * Math.sin(i * 1.7);
  const ph = 280 + 50 * Math.cos(i * 2.3);
  const x = -W / 2 + (W * (col + 0.5)) / cols + 30 * Math.sin(i * 3.1);
  const z = bz0 + (row === 0 ? (bz1 - bz0) * 0.7 : (bz1 - bz0) * 0.3) + 20 * Math.cos(i);
  nb.part(`notice-${i + 1}`, box(pw2, 4, ph, true).rotateY(6 * Math.sin(i * 2.9)).translate(x, -22, z).color(paper));
}
if (hasRoof.value === 'yes') {
  const ov = 180;
  const rise = 260;
  const run = 260;
  const ang = (Math.atan2(rise, run) * 180) / Math.PI;
  const sl = Math.hypot(rise, run) + 40;
  for (const sy of [-1, 1]) {
    nb.part(`roof-${sy < 0 ? 'front' : 'back'}`, box(W + 2 * pw + 2 * ov, sl, 40, true)
      .rotateX(-sy * ang).translate(0, sy * (sl / 2) * Math.cos((ang * Math.PI) / 180) - sy * 15, 2150 + rise - (sl / 2) * Math.sin((ang * Math.PI) / 180)).color(roofC));
  }
  nb.part('ridge-beam', blk(-W / 2 - pw, -40, 2149, W / 2 + pw, 40, 2150 + rise - 20).color(wood));
}

return nb.model();
