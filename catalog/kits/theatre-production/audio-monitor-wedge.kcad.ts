// SPDX-License-Identifier: CC0-1.0
// Audio monitor wedge: the floor monitor at the stage lip that lets a
// performer hear themselves.
// What makes it a wedge rather than a speaker box: a trapezoid side profile
// (tall back, low front) so the baffle tilts up at the performer's ears; a
// 15" woofer cone with a dust cap and a compression-driver horn mouth on that
// sloped baffle behind a bar grille; steel corner protectors; recessed side
// pocket handles; rubber skids underneath; and a rear plate with two speaker
// connectors.
// Generic visualization geometry at about real size (about 0.64 m wide, 0.5 m
// deep, 0.42 m tall), millimetres, Z up, baffle facing -Y and up, standing on
// z = 0.

meta({
  name: "audio-monitor-wedge",
  license: 'CC0-1.0',
  title: "Audio monitor wedge",
  description: "Stage floor monitor wedge at about real size: trapezoid cabinet tilting the baffle up at the performer, 15-inch woofer cone with dust cap and compression-driver horn behind a bar grille, steel corner protectors, recessed side pocket handles, rubber skids and a rear connector plate. Material controls: coated plywood cabinet, steel grille, woofer cone, zinc corner hardware. houseShow, touring and whiteWedge presets.",
  tags: ['monitor wedge', 'floor monitor', 'stage monitor', 'loudspeaker', 'foldback', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const cabinet = param('cabinet', '#24272a', { label: 'Coated plywood cabinet' });
const grille = param('grille', '#3c4246', { label: 'Steel grille' });
const cone = param('cone', '#5a5f63', { label: 'Woofer cone and horn' });
const hardware = param('hardware', '#b6bec2', { label: 'Zinc corner protectors and connectors' });

presets({
  houseShow: { cabinet: '#24272a', grille: '#3c4246', cone: '#5a5f63', hardware: '#b6bec2' },
  touring: { cabinet: '#1a1c1e', grille: '#202325', cone: '#3d4246', hardware: '#d9a43a' },
  whiteWedge: { cabinet: '#e7e9ea', grille: '#c4c9cc', cone: '#3b3f42', hardware: '#8c9599' },
});

const RUBBER = '#141617';

const p = assembly("audio-monitor-wedge");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Turned profile [r, z] revolved about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 640;
const Z0 = 14; // rubber skids lift the cabinet
// Baffle runs from the front edge (y = -250, z = 120) up to the back (y = 160, z = 420).
const LIP: [number, number] = [-250, Z0 + 106];
const TOP: [number, number] = [160, Z0 + 406];
const SLOPE = (Math.atan2(TOP[1] - LIP[1], TOP[0] - LIP[0]) * 180) / Math.PI;
const MID_Y = (LIP[0] + TOP[0]) / 2;
const MID_Z = (LIP[1] + TOP[1]) / 2;
// Place a shape built on z = 0 onto the baffle at (x, v along the slope).
const onBaffle = (shape: Shape, x: number, v: number) => shape.translate(x, v, 0).rotateX(SLOPE).translate(0, MID_Y, MID_Z);

const WV = -55; // woofer centre along the baffle
const HV = 175; // horn centre along the baffle

// Cabinet with a woofer port and horn mouth cut into the baffle and pocket handles in the sides.
let body = profileYZ([[-250, Z0], [250, Z0], [250, Z0 + 330], TOP, LIP], W);
body = body.subtract(onBaffle(cylinder(200, 160, 24).translate(0, 0, -100), 0, WV));
body = body.subtract(onBaffle(box(240, 90, 200, true), 0, HV));
for (const sx of [-1, 1]) body = body.subtract(box(60, 180, 70, true).translate(sx * W / 2, 40, Z0 + 230));
add("cabinet", body.color(cabinet));

// Woofer: thin cone shell, surround roll and dust cap, sitting in the port.
add("woofer-cone", onBaffle(turned([[42, -90], [52, -90], [158, -14], [158, -8], [148, -8], [42, -80]]), 0, WV).color(cone));
add("woofer-surround", onBaffle(torus(152, 7, 24).translate(0, 0, -10), 0, WV).color(RUBBER));
add("dust-cap", onBaffle(sphere(46).scale([1, 1, 0.45]).translate(0, 0, -86), 0, WV).color(RUBBER));
// Horn: flared mouth stepping down to the throat.
add("horn-flare", onBaffle(box(230, 80, 40, true).translate(0, 0, -30), 0, HV).color(RUBBER));
add("horn-throat", onBaffle(box(110, 40, 40, true).translate(0, 0, -10), 0, HV).color(cone));

// Bar grille over the baffle: frame plus bars across, held off the face.
const L = Math.hypot(TOP[0] - LIP[0], TOP[1] - LIP[1]);
add("grille-frame-lo", onBaffle(box(W - 40, 22, 14, true).translate(0, 0, 7), 0, -L / 2 + 20).color(grille));
add("grille-frame-hi", onBaffle(box(W - 40, 22, 14, true).translate(0, 0, 7), 0, L / 2 - 20).color(grille));
for (const sx of [-1, 1]) add(`grille-frame-${sx}`, onBaffle(box(22, L - 40, 14, true).translate(0, 0, 7), sx * (W / 2 - 31), 0).color(grille));
for (let k = 0; k < 9; k++) {
  const v = -L / 2 + 70 + k * 46;
  add(`grille-bar-${k}`, onBaffle(cylinder(W - 80, 4, 6).rotateY(90).translate(-(W - 80) / 2, 0, 9), 0, v).color(grille));
}
add("badge", onBaffle(box(90, 26, 6, true).translate(0, 0, 17), W / 2 - 110, -L / 2 + 20).color(hardware));

// Steel corner protectors on all eight cabinet corners.
const corners: [number, number][] = [[-250, Z0], [250, Z0], [250, Z0 + 330], TOP, LIP];
for (const sx of [-1, 1])
  for (const [y, z] of corners) add(`corner-${sx}-${y}-${z}`, box(46, 46, 46, true).translate(sx * (W / 2 - 18), y + (y < 0 ? 18 : -18), z + (z > Z0 + 50 ? -14 : 18)).color(hardware));

// Rubber skids under the cabinet.
for (const sy of [-1, 1]) add(`skid-${sy}`, box(W - 120, 40, Z0, true).translate(0, sy * 180, Z0 / 2).color(RUBBER));

// Rear connector plate with two speaker sockets and a handle bar.
add("rear-plate", box(200, 8, 120, true).translate(-120, 254, Z0 + 140).color(hardware));
for (const sx of [-1, 1]) add(`socket-${sx}`, cylinder(20, 22, 12).rotateX(-90).translate(-120 + sx * 50, 256, Z0 + 140).color(RUBBER));
add("rear-handle", cylinder(220, 13, 8).rotateY(90).translate(5, 290, Z0 + 270).color(hardware));
for (const x of [20, 210]) add(`rear-handle-post-${x}`, box(24, 40, 24, true).translate(x, 270, Z0 + 270).color(hardware));

return p.model();
