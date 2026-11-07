// SPDX-License-Identifier: CC0-1.0
// Paper shredder: an office bin shredder. What makes it one is the dark motor
// head sitting on top of a tall, slightly flared waste bin, with a long feed
// throat across the top showing the steel cutter slot, a separate credit-card
// slot, a small control panel with buttons and a status lamp, a smoked
// window in the bin front to see the shred level, a pull-out handle pocket
// and casters under the plinth.
// Generic visualization geometry at about real size (about 360 x 260 mm,
// 560 mm tall), millimetres, Z up, front toward -Y, lowest point on z = 0.
meta({
  name: 'paper-shredder',
  license: 'CC0-1.0',
  title: 'Paper shredder',
  description: "Office bin shredder: dark motor head over a flared pull-out waste bin, long feed throat with steel cutter slot, credit-card slot, control panel with buttons and status lamp, smoked shred-level window, handle pocket, plinth and casters. Material controls: bin polymer, head polymer, cutter steel, window glass; professional, classroom and allBlack presets.",
  tags: ['paper shredder', 'office machine', 'document disposal', 'office', 'equipment'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 2000,
});

const polymer = param('polymer', '#c7cccc', { label: 'Bin polymer' });
const headPolymer = param('headPolymer', '#2d3134', { label: 'Head polymer' });
const steel = param('steel', '#9aa1a4', { label: 'Cutter steel' });
const glass = param('glass', '#4f6f78', { label: 'Window glass' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#c7cccc', headPolymer: '#2d3134', steel: '#9aa1a4', glass: '#4f6f78' },
  classroom: { polymer: '#4e758c', headPolymer: '#e3e1d8', steel: '#a7adb0', glass: '#d4b24d' },
  allBlack: { polymer: '#33373a', headPolymer: '#1c1f21', steel: '#b6bcbf', glass: '#6b8792' },
});

const office = assembly('paper-shredder');
const add = (name, shape) => office.part(name, shape.scale(k));

// Rounded rectangle w x d with corner radius r, as points.
const rrPts = (w, d, r) => {
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]]) {
    for (let i = 0; i <= 3; i += 1) {
      const a = ((a0 + i * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};
const rrect = (w, d, r) => {
  const pts = rrPts(w, d, r);
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Stack rounded rectangles: stations are [z, w, d, r].
const shell = (st) =>
  rrect(st[0][1], st[0][2], st[0][3]).loft(st.slice(1).map(([, w, d, r]) => rrect(w, d, r)), {
    planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
    ruled: true,
  });
// Rounded plate w x h in XZ, t thick, its back face at y (facing -Y).
const frontPlate = (w, h, r, t, x, y, z) => extrudePolygon(rrPts(w, h, r), t).rotateX(90).translate(x, y, z);

const BIN0 = 40;
const BIN1 = 420;
// Plinth and casters.
add('plinth', extrudePolygon(rrPts(318, 222, 18), 14).translate(0, 0, 26).color(headPolymer));
for (const [x, y] of [[-135, -88], [135, -88], [-135, 88], [135, 88]]) {
  const tag = `${x < 0 ? 'left' : 'right'}-${y < 0 ? 'front' : 'rear'}`;
  add(`caster-fork-${tag}`, box(16, 22, 10, true).translate(x, y, 21).color(headPolymer));
  add(`caster-wheel-${tag}`, cylinder(12, 13, 12).rotateX(90).translate(x, y + 6, 13).color(headPolymer));
}

// Waste bin: flares slightly toward the top.
add('bin', shell([[BIN0, 326, 226, 22], [BIN1, 342, 242, 24]]).color(polymer));
// Shred-level window and handle pocket in the bin front.
const frontY = (z) => -(113 + (8 * (z - BIN0)) / (BIN1 - BIN0));
add('window-frame', frontPlate(84, 236, 14, 3, 0, frontY(220) - 0.5, 220).color(headPolymer));
add('window', frontPlate(70, 222, 10, 2, 0, frontY(220) - 2.5, 220).color(glass));
add('handle-pocket', frontPlate(150, 26, 12, 3, 0, frontY(392) - 0.5, 392).color(headPolymer));
add('handle-lip', frontPlate(150, 6, 2.5, 4, 0, frontY(380) - 1, 380).color(polymer));
// Seam between bin and head.
add('bin-rim', extrudePolygon(rrPts(346, 246, 24), 4).translate(0, 0, BIN1 - 2).color(steel));

// Motor head with a chamfered top edge.
const HEAD1 = 520;
add('head', shell([[BIN1, 356, 256, 26], [HEAD1 - 18, 356, 256, 26], [HEAD1, 336, 236, 18]]).color(headPolymer));
// Feed throat: raised moulding with the steel cutter slot running across it.
add('feed-throat', shell([[HEAD1 - 1, 286, 52, 20], [HEAD1 + 8, 266, 34, 14]]).translate(0, -10, 0).color(headPolymer));
add('throat-lip-front', box(250, 3, 3, true).translate(0, -18, HEAD1 + 9).color(steel));
add('throat-lip-rear', box(250, 3, 3, true).translate(0, -2, HEAD1 + 9).color(steel));
add('cutter-slot', box(244, 6, 1, true).translate(0, -10, HEAD1 + 8).color(steel));
// Credit-card slot at the back.
add('card-slot-surround', extrudePolygon(rrPts(110, 18, 8), 4).translate(-70, 70, HEAD1 - 1).color(headPolymer));
add('card-slot', box(80, 3, 1, true).translate(-70, 70, HEAD1 + 3).color(steel));

// Control panel: a raised pad with three push buttons and a status lamp.
add('control-panel', extrudePolygon(rrPts(96, 44, 10), 3).translate(100, 70, HEAD1 - 1).color(polymer));
for (const [i, x] of [76, 98, 120].entries()) {
  add(`button-${i + 1}`, cylinder(4, 7, 12).translate(x, 70, HEAD1 + 2).color(steel));
}
add('status-lamp', cylinder(3, 3.5, 10).translate(138, 70, HEAD1 + 2).color(glass));
// Vent louvres along the head front.
for (let i = 0; i < 6; i += 1) {
  add(`vent-${i + 1}`, frontPlate(4, 30, 1.5, 1.5, 110 + i * 9, -127.5, HEAD1 - 52).color(steel));
}

return office.model();
