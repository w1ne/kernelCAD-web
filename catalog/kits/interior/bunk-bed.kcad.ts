// Original kernelCAD low-poly bunk bed: four posts, two single bed frames
// with mattresses, blankets and pillows, guard rails on top and a ladder at
// the front. Long axis along X. Millimetres, Z up, standing on z = 0 centred
// on x = y = 0. Front (ladder side) faces -Y.

meta({
  name: 'bunk-bed',
  license: 'CC0-1.0',
  title: 'Bunk bed',
  description: 'Two-tier single bunk bed with posts, end boards, top guard rails, a front ladder, mattresses, blankets and pillows. Knobs: ladder side, frame, sheet, top and bottom blanket colours.',
  tags: ['bunk bed', 'bed', 'bunk', 'kids room', 'dorm', 'hostel', 'bedroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'kids-room', 'dorm'],
  triangleBudget: 500,
});

const ladder = param('ladder', 'right', { choices: ['left', 'right'], label: 'Ladder side' });
const frame = param('frame', '#c69c6d', { label: 'Frame' });
const sheets = param('sheets', '#f1eee6', { label: 'Sheets and pillows' });
const top = param('top', '#3c6e9f', { label: 'Top blanket' });
const bottom = param('bottom', '#c2553f', { label: 'Bottom blanket' });

presets({
  white: { frame: '#eceae4', top: '#e6a93a', bottom: '#5c8f6a' },
  dark: { frame: '#4a3324', top: '#6a5a8f', bottom: '#3f6a5a' },
});

const L = 2060;
const D = 960;
const H = 1650;
const p = 60; // post size
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const bb = assembly('bunk-bed');
const xs = [-L / 2, L / 2 - p];
const ys = [-D / 2, D / 2 - p];
let k = 0;
for (const x of xs) for (const y of ys) bb.part(`post-${++k}`, blk(x, y, 0, x + p, y + p, H).color(frame));

const lx0 = -L / 2 + p - 1;
const lx1 = L / 2 - p + 1;
const ly0 = -D / 2 + p - 1;
const ly1 = D / 2 - p + 1;
for (const [tier, z, blanket] of [['lower', 220, bottom], ['upper', 1180, top]] as const) {
  // Side rails, end boards, slat deck.
  bb.part(`${tier}-rail-front`, blk(lx0, -D / 2 + 5, z, lx1, -D / 2 + 30, z + 130).color(frame));
  bb.part(`${tier}-rail-back`, blk(lx0, D / 2 - 30, z, lx1, D / 2 - 5, z + 130).color(frame));
  bb.part(`${tier}-end-left`, blk(-L / 2 + 10, ly0, z, -L / 2 + 40, ly1, z + 420).color(frame));
  bb.part(`${tier}-end-right`, blk(L / 2 - 40, ly0, z, L / 2 - 10, ly1, z + 320).color(frame));
  bb.part(`${tier}-deck`, blk(lx0, -D / 2 + 29, z + 20, lx1, D / 2 - 29, z + 45).color(frame));
  bb.part(`${tier}-mattress`, blk(-L / 2 + p + 5, -D / 2 + 35, z + 44, L / 2 - p - 5, D / 2 - 35, z + 200).color(sheets));
  bb.part(`${tier}-blanket`, blk(-L / 2 + 620, -D / 2 + 25, z + 120, L / 2 - p, D / 2 - 25, z + 225).color(blanket));
  bb.part(`${tier}-pillow`, blk(-L / 2 + p + 50, -D / 2 + 140, z + 199, -L / 2 + p + 450, D / 2 - 140, z + 290).color(sheets));
}

// Upper guard rails: full at the back, with a gap for the ladder at the front.
const gz = 1500;
const sgn = ladder.value === 'right' ? 1 : -1;
const gap0 = sgn * (L / 2 - p - 520);
bb.part('guard-back', blk(lx0, D / 2 - 40, gz, lx1, D / 2 - 5, gz + 60).color(frame));
const gfx0 = sgn > 0 ? lx0 : gap0;
const gfx1 = sgn > 0 ? gap0 : lx1;
bb.part('guard-front', blk(gfx0, -D / 2 + 5, gz, gfx1, -D / 2 + 40, gz + 60).color(frame));
bb.part('guard-post', blk(gap0 - 25, -D / 2 + 5, 1300, gap0 + 25, -D / 2 + 40, gz + 60).color(frame));

// Ladder: two stiles leaning out slightly in front of the beds, and rungs.
const lc = sgn * (L / 2 - p - 260);
const ly = -D / 2 - 20;
for (const dx of [-200, 200]) {
  bb.part(`ladder-stile-${dx < 0 ? 'a' : 'b'}`, blk(lc + dx - 20, ly - 25, 0, lc + dx + 20, ly + 25, gz + 60).color(frame));
}
for (let i = 0; i < 4; i++) {
  const z = 330 + i * 300;
  bb.part(`ladder-rung-${i + 1}`, blk(lc - 181, ly - 20, z, lc + 181, ly + 20, z + 35).color(frame));
}
// The ladder hooks onto the front rails.
bb.part('ladder-hook', blk(lc - 200, ly, 1180, lc + 200, -D / 2 + 10, 1310).color(frame));

return bb.model();
