// SPDX-License-Identifier: CC0-1.0
// Digestate separator: the screw-press separator that splits anaerobic
// digester output into a stackable fibre and a liquid fraction. What makes it
// that machine rather than a pipe on legs: a horizontal stainless press body
// with a perforated screen section, a feed hopper and pump pipe on top, a
// gearmotor driving the screw from one end, a weighted outlet flap at the
// other end dropping pressed fibre onto a growing heap, and a liquor tray
// under the screen draining down to a pipe. It stands on a tall frame so a
// loader can scoop the heap from underneath.
// Generic visualization geometry at about real size (3.8 m long press, 2.6 m
// high), millimetres, Z up, press runs along X with the drive on -X and the
// heap on +X.

meta({
  name: "digestate-separator",
  license: 'CC0-1.0',
  title: "Digestate separator",
  description: "Screw-press digestate separator at about real size: stainless press body with a perforated screen section on a tall braced frame, feed hopper and pump pipe, end-mounted gearmotor, counterweighted outlet flap dropping pressed fibre onto a heap, liquor tray with drain pipe and feed pump on a plinth. Material controls: stainless press, frame paint, drive and separated fibre. plant, weathered, farmBiogas and highVisibility presets.",
  tags: ["recycling", "anaerobic digestion", "biogas", "digestate", "screw press", "separator", "organics", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#c6cdcf', { label: 'Press body, hopper and pipework (stainless)' });
const frame = param('frame', '#3d6b45', { label: 'Support frame (paint)' });
const drive = param('drive', '#2f5ea8', { label: 'Gearmotor and pump' });
const fibre = param('fibre', '#6b5233', { label: 'Separated fibre heap' });

presets({
  plant: { stainless: '#c6cdcf', frame: '#3d6b45', drive: '#2f5ea8', fibre: '#6b5233' },
  weathered: { stainless: '#a5a9a4', frame: '#55604f', drive: '#4f6178', fibre: '#5a4a35' },
  farmBiogas: { stainless: '#d3d8da', frame: '#b33a2a', drive: '#2f7d3f', fibre: '#8a6a3c' },
  highVisibility: { stainless: '#e3e6e6', frame: '#f0b429', drive: '#d4572a', fibre: '#6b5233' },
});

const p = assembly("digestate-separator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// An (x, z) side profile extruded along Y over width t, centred on y = 0.
const profileXZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const ZA = 2000, X0 = -1600, X1 = 1500;

// Press body along X: inlet housing, perforated screen section, press-out cone.
add("inlet-housing", cylinder(900, 260, 18).rotateY(90).translate(X0, 0, ZA).color(stainless));
add("screen", cylinder(1500, 230, 18).rotateY(90).translate(X0 + 900, 0, ZA).color('#7f888b'));
for (let k = 0; k <= 5; k++) add(`screen-ring-${k}`, cylinder(40, 250, 18).rotateY(90).translate(X0 + 900 + k * 290, 0, ZA).color(stainless));
add("press-housing", cylinder(700, 260, 18).rotateY(90).translate(X0 + 2400, 0, ZA).color(stainless));
for (const x of [X0, X0 + 880, X0 + 2400, X1]) add(`flange-${x}`, cylinder(40, 300, 18).rotateY(90).translate(x, 0, ZA).color(stainless));

// Outlet flap with counterweight arms on each side.
add("outlet-flap", blk(X1 + 120, 0, ZA - 330, 60, 520, 560).color(stainless));
for (const s of [-1, 1]) {
  add(`weight-arm-${s}`, box(700, 30, 40, true).rotateY(20).translate(X1 - 200, s * 330, ZA + 280).color(frame));
  add(`counterweight-${s}`, cylinder(80, 90, 12).rotateX(s > 0 ? -90 : 90).translate(X1 - 520, s * 330, ZA + 400).color(drive));
}

// Feed hopper and the pump pipe that brings raw digestate up to it.
add("feed-hopper", turned([[150, ZA + 200], [320, ZA + 650], [320, ZA + 760], [0, ZA + 760], [0, ZA + 200]]).translate(X0 + 450, 0, 0).color(stainless));
add("feed-neck", cylinder(200, 150, 14).translate(X0 + 450, 0, ZA + 100).color(stainless));
add("feed-pipe-drop", cylinder(400, 70, 10).translate(X0 + 450, -500, ZA + 500).color(stainless));
add("feed-pipe-over", cylinder(500, 70, 10).rotateX(-90).translate(X0 + 450, -500, ZA + 900).color(stainless));
add("feed-elbow", sphere(90).translate(X0 + 450, -500, ZA + 900).color(stainless));
add("feed-riser", cylinder(ZA + 500 - 420, 70, 10).translate(X0 + 450, -500, 420).color(stainless));

// End-mounted gearmotor on -X.
add("gearbox", blk(X0 - 230, 0, ZA - 280, 460, 520, 560).color(drive));
add("motor", cylinder(560, 170, 16).rotateY(-90).translate(X0 - 460, 0, ZA).color(drive));
add("motor-fan-cover", cylinder(50, 180, 16).rotateY(-90).translate(X0 - 1020, 0, ZA).color(frame));
add("drive-bracket", blk(X0 - 300, 0, ZA - 600, 600, 520, 40).color(frame));

// Liquor tray under the screen, sloping to a drain pipe at -Y.
add("liquor-tray", profileXZ([[X0 + 850, ZA - 260], [X0 + 2450, ZA - 260], [X0 + 2450, ZA - 380], [X0 + 850, ZA - 480]], 640).color(stainless));
add("drain-pipe", cylinder(ZA - 480, 80, 10).translate(X0 + 950, -150, 0).color(stainless));

// Tall braced frame: four legs, top rails and X braces on the long faces.
const LX0 = X0 - 300, LX1 = X1 - 200, LY = 450;
for (const x of [LX0, LX1]) for (const s of [-1, 1]) {
  add(`leg-${x}-${s}`, blk(x, s * LY, 0, 140, 140, ZA - 260).color(frame));
  add(`foot-${x}-${s}`, blk(x, s * LY, 0, 280, 280, 20).color(stainless));
}
for (const s of [-1, 1]) add(`top-rail-${s}`, blk((LX0 + LX1) / 2, s * LY, ZA - 400, LX1 - LX0 + 140, 140, 140).color(frame));
for (const x of [LX0, LX1]) add(`cross-rail-${x}`, blk(x, 0, ZA - 400, 140, 2 * LY, 140).color(frame));
const BL = Math.hypot(LX1 - LX0, ZA - 700), BA = (Math.atan2(ZA - 700, LX1 - LX0) * 180) / Math.PI;
for (const s of [-1, 1]) for (const d of [-1, 1]) add(`brace-${s}-${d}`, box(BL, 60, 60, true).rotateY(-d * BA).translate((LX0 + LX1) / 2, s * LY, 300 + (ZA - 700) / 2).color(frame));

// Pressed fibre heap under the outlet, and a feed pump on a plinth at the front.
add("fibre-heap", turned([[0, 0], [1100, 0], [500, 600], [150, 900], [0, 920]]).translate(X1 + 300, 0, 0).color(fibre));
add("pump-plinth", blk(X0 + 450, -900, 0, 900, 500, 150).color('#9e9a90'));
add("pump-body", cylinder(260, 160, 14).rotateY(90).translate(X0 + 150, -900, 360).color(drive));
add("pump-motor", cylinder(380, 140, 14).rotateY(90).translate(X0 + 410, -900, 360).color(drive));
add("pump-outlet", cylinder(400, 70, 10).rotateX(-90).translate(X0 + 450, -900, 420).color(stainless));
add("pump-inlet", cylinder(700, 70, 10).rotateY(-90).translate(X0 + 150, -900, 360).color(stainless));

return p.model();
