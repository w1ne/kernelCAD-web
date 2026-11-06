// SPDX-License-Identifier: CC0-1.0
// Nacelle transport frame: the welded I-beam bed a turbine nacelle is bolted to
// for road and sea transport. Twin main girders and cross bearers carry a raised
// yaw-adapter ring with a bolt circle that matches the nacelle bedplate, with
// lifting lugs and shackles at each corner. The circular bolted adapter is what
// separates it from a plain pallet frame. An optional nacelle body shows the
// frame in use. Stylized catalog geometry, millimetres, Z up, nose towards -X.
meta({
  name: "nacelle-transport-frame",
  license: 'CC0-1.0',
  title: "Nacelle transport frame",
  description: "Welded I-beam nacelle transport bed with twin main girders, cross bearers, X-bracing, a raised bolted yaw-adapter ring, corner lifting lugs with shackles and an optional nacelle load. Shape choices: loaded or empty, ground skids or storage trestles. Material controls: structural steel, safety paint, galvanized hardware and nacelle composite; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'nacelle', 'transport', 'frame', 'logistics', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const load = param('load', 'nacelle', { choices: ['nacelle', 'empty'], label: 'Load' });
const feet = param('feet', 'skids', { choices: ['skids', 'trestle'], label: 'Support' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint (lifting points)' });
const galvanizedHardware = param('galvanizedHardware', '#aab3b4', { label: 'Galvanized hardware' });
const nacelleComposite = param('nacelleComposite', '#e6e8e3', { label: 'Nacelle composite' });

presets({
  weathered: { structuralSteel: '#425258', safetyPaint: '#c99a3a', galvanizedHardware: '#878f8c', nacelleComposite: '#c9cbc4' },
  highVisibility: { structuralSteel: '#4b5c63', safetyPaint: '#f7c331', galvanizedHardware: '#d2d8d9', nacelleComposite: '#f5f6f2' },
});

const p = assembly("nacelle-transport-frame");
const add = (name, shape) => p.part(name, shape.scale(scale));
const steel = (name, shape) => add(name, shape.color(structuralSteel));
const painted = (name, shape) => add(name, shape.color(safetyPaint));
const hardware = (name, shape) => add(name, shape.color(galvanizedHardware));
const composite = (name, shape) => add(name, shape.color(nacelleComposite));

// Closed (y, z) outline extruded `length` along X, centred on x = 0.
const sideProfile = (pts, length) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [y, z] of pts.slice(1)) outline = outline.lineTo(y, z);
  return outline.close().extrude(length).rotateX(90).rotateZ(90).translate(-length / 2, 0, 0);
};
// Closed (x, z) outline extruded `length` along Y, centred on y = 0.
const crossProfile = (pts, length) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(length).rotateX(90).translate(0, length / 2, 0);
};
// (radius, z) outline revolved about the vertical axis.
const ring = (pts) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) outline = outline.lineTo(r, z);
  return outline.close().revolve();
};
const iBeam = (w, h, web, flange) => [
  [-w / 2, 0], [w / 2, 0], [w / 2, flange], [web / 2, flange], [web / 2, h - flange], [w / 2, h - flange],
  [w / 2, h], [-w / 2, h], [-w / 2, h - flange], [-web / 2, h - flange], [-web / 2, flange], [-w / 2, flange],
];

const L = 1500;
const gy = 360;
const gh = 170;
const z0 = feet.value === 'trestle' ? 300 : 40;
const ringX = -170;

// Main girders, cross bearers and an X-braced rear bay.
for (const side of [-1, 1]) steel('main-girder' + (side < 0 ? '-left' : '-right'), sideProfile(iBeam(110, gh, 12, 16), L).translate(0, side * gy, z0));
for (const [i, x] of [-690, -400, 60, 690].entries()) {
  steel('cross-bearer-' + (i + 1), crossProfile(iBeam(110, 130, 10, 14), 2 * gy - 20).translate(x, 0, z0 + 20));
}
const bay = Math.atan2(2 * gy - 60, 600) * (180 / Math.PI);
for (const sign of [-1, 1]) steel('plan-brace' + (sign < 0 ? '-a' : '-b'), box(Math.hypot(600, 2 * gy - 60), 50, 80, true).rotateZ(sign * bay).translate(375, 0, z0 + 70));

// Yaw-adapter: a stiffened deck plate under a raised bolted flange ring.
steel('adapter-deck', box(760, 2 * gy + 110, 24, true).translate(ringX, 0, z0 + gh + 12));
const ringZ = z0 + gh + 24;
steel('adapter-ring', ring([[250, 0], [345, 0], [345, 36], [310, 70], [250, 70]]).translate(ringX, 0, ringZ));
for (let i = 0; i < 16; i += 1) {
  const a = (2 * Math.PI * (i + 0.5)) / 16;
  hardware('flange-bolt-' + (i + 1), cylinder(36, 16, 6).translate(ringX + 296 * Math.cos(a), 296 * Math.sin(a), ringZ + 70));
}

// Lifting lugs with bow shackles at the four girder ends; painted end bands.
const lug = [[-80, 0], [80, 0], [60, 100]];
for (let k = 0; k <= 6; k += 1) lug.push([58 * Math.cos((Math.PI * k) / 6), 110 + 58 * Math.sin((Math.PI * k) / 6)]);
lug.push([-60, 100]);
for (const x of [-L / 2 + 100, L / 2 - 100]) {
  for (const side of [-1, 1]) {
    const id = (x < 0 ? '-front' : '-rear') + (side < 0 ? '-left' : '-right');
    painted('lifting-lug' + id, crossProfile(lug, 28).translate(x, side * gy, z0 + gh));
    hardware('shackle' + id, ring([[44, -10], [62, -10], [62, 10], [44, 10]]).rotateY(90).translate(x, side * gy, z0 + gh + 150));
    painted('end-band' + id, box(60, 116, gh + 2, true).translate(Math.sign(x) * (L / 2 - 30), side * gy, z0 + gh / 2));
  }
}

// Supports: low skid plates on the ground, or A-shaped storage trestles.
for (const x of [-L / 2 + 160, L / 2 - 160]) {
  for (const side of [-1, 1]) {
    const id = (x < 0 ? '-front' : '-rear') + (side < 0 ? '-left' : '-right');
    if (feet.value === 'trestle') {
      steel('trestle-leg' + id, sideProfile([[-150, 0], [150, 0], [70, z0], [-70, z0]], 140).translate(x, side * gy, 0));
      hardware('trestle-pad' + id, box(220, 340, 20, true).translate(x, side * gy, 10));
    } else {
      steel('skid-plate' + id, box(260, 200, z0, true).translate(x, side * gy, z0 / 2));
    }
  }
}

if (load.value === 'nacelle') {
  // Nacelle body lofted nose-to-tail along X: a rounded-box housing that bulges
  // behind the main bearing and steps in at the tail.
  const zb = ringZ + 70;
  const station = (W, H, zc) => {
    const pts = [];
    for (let k = 0; k < 12; k += 1) {
      const a = (2 * Math.PI * (k + 0.5)) / 12;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pts.push([-(zc + (H / 2) * Math.sign(s) * Math.abs(s) ** 0.45), (W / 2) * Math.sign(c) * Math.abs(c) ** 0.45]);
    }
    let outline = path().moveTo(pts[0][0], pts[0][1]);
    for (const [u, v] of pts.slice(1)) outline = outline.lineTo(u, v);
    return outline.close();
  };
  const stations = [[-760, 460, 460, zb + 400], [-620, 740, 640, zb + 320], [520, 780, 680, zb + 340], [680, 680, 580, zb + 330]];
  const profiles = stations.map(([, W, H, zc]) => station(W, H, zc));
  composite('nacelle-housing', profiles[0].loft(profiles.slice(1), {
    planes: stations.map(([x]) => ({ plane: 'XY', origin: [0, 0, x] })),
    ruled: true,
  }).rotateY(90));
  hardware('main-shaft-flange', cylinder(110, 210, 16).rotateY(-90).translate(-760, 0, zb + 400));
  steel('roof-cooler', box(360, 600, 140, true).translate(360, 0, zb + 340 + 340 + 50));
  hardware('met-mast', cylinder(380, 18, 6).translate(600, 0, zb + 660));
  hardware('met-mast-arm', box(30, 360, 30, true).translate(600, 0, zb + 1020));
}

return p.model();
