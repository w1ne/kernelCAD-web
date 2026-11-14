// SPDX-License-Identifier: CC0-1.0
// Rigging handline cleat: a wall-mounted cleat board on a hemp fly floor,
// two horn cleats each with its line tied off in a figure-eight and the tail
// hanging in a coil, a fairlead above and a belaying-pin rail below.
// What makes it a cleat board rather than a panel of posts: real horn cleats
// (two legs out from the base, a bar with tapered horns, the gap behind it
// for the rope), lines coming down through the fairlead and crossing the
// cleat face, hanging coils, set-name cards and a pin rail with turned pins.
// Generic visualization geometry at about real size (0.9 m board, 1.7 m
// tall), millimetres, Z up, board face toward -Y, standing on z = 0.

meta({
  name: "rigging-handline-cleat",
  license: 'CC0-1.0',
  title: "Rigging handline cleat",
  description: "Hemp-house cleat board at about real size: plywood board in a steel angle frame, two cast horn cleats with legs, tapered horns and the rope gap, handlines down through a top fairlead tied off in figure-eights with hanging coils, set-name cards, and a belaying-pin rail with three turned pins. Material controls: board, cleats, rope, steel hardware. houseShow, touring and naturalPly presets.",
  tags: ['cleat', 'horn cleat', 'handline', 'hemp rigging', 'pin rail', 'belaying pin', 'fly floor', 'theatre rigging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const board = param('board', '#2a2c2e', { label: 'Cleat board' });
const cleat = param('cleat', '#8e979c', { label: 'Horn cleats' });
const rope = param('rope', '#c9a466', { label: 'Handlines' });
const hardware = param('hardware', '#5b646a', { label: 'Frame, fairlead and pin rail' });

presets({
  houseShow: { board: '#2a2c2e', cleat: '#8e979c', rope: '#c9a466', hardware: '#5b646a' },
  touring: { board: '#24466e', cleat: '#d9dcdc', rope: '#ece6d6', hardware: '#e2a21c' },
  naturalPly: { board: '#c49a62', cleat: '#2b2f32', rope: '#b7894a', hardware: '#3c4247' },
});

const LABEL = '#f1efe6';
const INK = '#1d1f21';

const p = assembly("rigging-handline-cleat");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
// Rope strand between two (x, z) points on the plane y.
const strand = (x1: number, z1: number, x2: number, z2: number, y: number, r = 11) => {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  return cylinder(len, r, 10).rotateY((Math.atan2(dx, dz) * 180) / Math.PI).translate(x1, y, z1);
};

const W = 900;
const H = 1700;
const BT = 25; // board thickness, wall side on +Y

add("board", box(W, BT, H, true).translate(0, BT / 2, H / 2).color(board));
for (const [s, x] of [["left", -W / 2 - 15], ["right", W / 2 + 15]] as [string, number][])
  add(`frame-${s}`, box(30, 45, H, true).translate(x, 5, H / 2).color(hardware));
add("frame-top", box(W + 60, 45, 30, true).translate(0, 5, H - 15).color(hardware));
add("frame-bottom", box(W + 60, 45, 30, true).translate(0, 5, 15).color(hardware));

// Horn cleat side profile: base on the wall, two legs, bar with horns.
const cleatPts = [[0, -100], [0, 100], [-40, 78], [-66, 165], [-86, 186], [-104, 172], [-100, 60], [-100, -60], [-104, -172], [-86, -186], [-66, -165], [-40, -78]];
const cleatShape = profileYZ(cleatPts, 52).subtract(box(80, 44, 90, true).translate(0, -40, 0));

const CZ = 1120; // cleat centre
const FZ = 1580; // fairlead height
add("fairlead-bar", box(W - 80, 130, 30, true).translate(0, -65, FZ).color(hardware));

for (const [s, cx] of [["stage-left", -210], ["stage-right", 210]] as [string, number][]) {
  add(`cleat-${s}`, cleatShape.translate(cx, 0, CZ).color(cleat));

  // Line down through the fairlead, round turn, figure-eight, locking turn.
  add(`fairlead-ring-${s}`, torus(30, 7, 14).translate(cx - 40, -100, FZ + 15).color(hardware));
  add(`line-${s}`, cylinder(1850 - CZ - 160, 11, 10).translate(cx - 40, -100, CZ + 160).color(rope));
  add(`turn-top-${s}`, strand(cx - 40, CZ + 150, cx + 40, CZ + 140, -114).color(rope));
  add(`cross-a-${s}`, strand(cx + 40, CZ + 140, cx - 40, CZ - 140, -120).color(rope));
  add(`cross-b-${s}`, strand(cx - 40, CZ + 130, cx + 40, CZ - 150, -128).color(rope));
  add(`turn-bottom-${s}`, strand(cx - 40, CZ - 140, cx + 40, CZ - 150, -114).color(rope));

  // Tail down to a coil hanging on the line.
  const coilZ = CZ - 440;
  add(`tail-${s}`, strand(cx + 40, CZ - 150, cx + 10, coilZ + 120, -110).color(rope));
  for (let k = 0; k < 3; k++)
    add(`coil-${s}-${k + 1}`, torus(120 - k * 6, 11, 16).rotateX(90).translate(cx + k * 8 - 8, -96 - k * 10, coilZ - k * 10).color(rope));

  // Set-name card above the cleat.
  add(`card-${s}`, box(240, 4, 120, true).translate(cx, -2, CZ + 290).color(LABEL));
  add(`card-band-${s}`, box(240, 5, 26, true).translate(cx, -3, CZ + 330).color(INK));
}

// Belaying-pin rail: pipe on two brackets, three turned pins through it.
const RZ = 360;
add("pin-rail", alongX(W - 80, 24).translate(-(W - 80) / 2, -110, RZ).color(hardware));
for (const [s, x] of [["left", -340], ["right", 340]] as [string, number][])
  add(`rail-bracket-${s}`, box(30, 110, 40, true).translate(x, -55, RZ).color(hardware));
const pin = (() => {
  const pts = [[0, -150], [10, -150], [10, 0], [20, 6], [20, 18], [14, 26], [16, 120], [12, 160], [0, 166]];
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
})();
for (const [s, x] of [["a", -60], ["b", 0], ["c", 60]] as [string, number][])
  add(`belaying-pin-${s}`, pin.translate(x, -110, RZ + 24).color(cleat));

return p.model();
