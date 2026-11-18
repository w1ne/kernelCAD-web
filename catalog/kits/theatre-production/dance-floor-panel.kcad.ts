// SPDX-License-Identifier: CC0-1.0
// Dance floor panel: one portable sprung-floor panel of the kind a touring
// dance company lays over a stage, shown with a stepped cutaway at the near
// corner so the build-up can be read from the outside.
// What makes it a sprung dance floor rather than a slab: a vinyl performance
// surface (marley) with a taped seam and spike marks, two crossed plywood
// skins under it, a grid of timber battens, round elastomer shock pads under
// every batten crossing, an aluminium bevelled edge ramp on the open front
// edge and alignment dowels on the joining edge for the next panel.
// Generic visualization geometry at about real size (1.2 m square, 104 mm
// build height), millimetres, Z up, front toward -Y, pads on z = 0.

meta({
  name: "dance-floor-panel",
  license: 'CC0-1.0',
  title: "Dance floor panel",
  description: "Portable sprung dance-floor panel at about real size (1.2 m square, 104 mm high) with a stepped corner cutaway showing the build-up: vinyl performance surface with taped seam and spike marks, two crossed plywood skins, a timber batten grid on round elastomer shock pads, an aluminium bevelled edge ramp on the front edge and alignment dowels for the next panel. Material controls: vinyl surface, plywood and battens, shock pads, edge ramp and tape. studio, ballet and touring presets.",
  tags: ['dance floor', 'sprung floor', 'marley', 'vinyl dance floor', 'portable floor', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const vinyl = param('vinyl', '#1f2124', { label: 'Vinyl performance surface' });
const timber = param('timber', '#c99a5f', { label: 'Plywood and battens' });
const pads = param('pads', '#3d7fc4', { label: 'Elastomer shock pads' });
const trim = param('trim', '#b9c0c4', { label: 'Edge ramp and seam tape' });

presets({
  studio: { vinyl: '#1f2124', timber: '#c99a5f', pads: '#3d7fc4', trim: '#b9c0c4' },
  ballet: { vinyl: '#8d8f92', timber: '#d8b07a', pads: '#d24b3a', trim: '#e8e6e0' },
  touring: { vinyl: '#2a2b2e', timber: '#9b7246', pads: '#e0a91d', trim: '#3a3e42' },
});

const SPIKE = ['#f2c418', '#e0483c', '#3fb26b'];

const p = assembly("dance-floor-panel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const H = 600; // half size of the panel
// Outline of a square panel with the front-left corner notched out to
// (cx, cy): each layer up the stack gets a larger notch, so the cutaway
// steps down through the build-up.
const notched = (cx: number, cy: number) => [[cx, -H], [H, -H], [H, H], [-H, H], [-H, cy], [cx, cy]];

// Elastomer pads under every batten crossing.
const PAD = 25;
const xs = [-520, -260, 0, 260, 520];
for (const [i, y] of [-540, -270, 0, 270, 540].entries())
  for (const [j, x] of xs.entries())
    add(`pad-${i}-${j}`, cylinder(PAD, 38, 12).translate(x, y, 0).color(pads));

// Battens run along X on the pads, with cross noggins at the ends.
const BT = 45;
for (const [i, y] of [-540, -270, 0, 270, 540].entries())
  add(`batten-${i}`, blk(0, y, PAD, 2 * H - 20, 70, BT).color(timber));
for (const [s, x] of [["l", -H + 35], ["r", H - 35]] as [string, number][])
  add(`noggin-${s}`, blk(x, 0, PAD, 70, 2 * H - 20, BT).color(timber));

// Two plywood skins and the vinyl surface, each with a bigger notch.
const Z1 = PAD + BT;
add("ply-lower", extrudePolygon(notched(-200, -200), 15).translate(0, 0, Z1).color(timber));
add("ply-upper", extrudePolygon(notched(-100, -100), 12).translate(0, 0, Z1 + 15).color(timber));
const ZT = Z1 + 27;
add("vinyl", extrudePolygon(notched(-20, -20), 4).translate(0, 0, ZT).color(vinyl));
// Darker joint lines between the ply sheets show at the cutaway step.
add("ply-joint", blk(-150, -150, Z1 + 15, 6, 6, 12).color('#5a4630'));

// Taped seam across the vinyl and spike marks for dancers' positions.
add("seam-tape", blk(H / 2 - 40, 0, ZT + 4, 50, 2 * H - 4, 1).color(trim));
for (const [i, [x, y]] of [[-300, 300], [100, -250], [300, 250]].entries()) {
  add(`spike-${i}-a`, blk(x, y, ZT + 4, 90, 18, 1).color(SPIKE[i]));
  add(`spike-${i}-b`, blk(x, y, ZT + 4, 18, 90, 1).color(SPIKE[i]));
}

// Bevelled aluminium edge ramp along the open front edge (stopping at the
// cutaway so it does not hide it).
const ZR = ZT + 4;
const RL = H + 20;
add("edge-ramp", profileYZ([[-H, 0], [-H, ZR], [-H - 12, ZR], [-H - 120, 2], [-H - 120, 0]], RL).translate(H - RL / 2, 0, 0).color(trim));
for (const [i, x] of [100, 330, 520].entries())
  add(`ramp-screw-${i}`, cylinder(2, 7, 10).translate(x, -H - 20, ZR - 9).color('#4a4f54'));

// Alignment dowels sticking out of the joining edge at the back.
for (const [i, x] of [-400, 0, 400].entries())
  add(`dowel-${i}`, cylinder(60, 10, 10).rotateX(-90).translate(x, H, Z1 + 14).color(trim));

return p.model();
