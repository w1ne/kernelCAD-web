// SPDX-License-Identifier: CC0-1.0
// Greenhouse grow light bar: a slim LED top-light hung from the bottom chord
// of a greenhouse truss, the modern replacement for the HPS lamp.
// What makes it an LED top-light: a long extruded aluminium heat sink with a
// row of cooling fins along its back, a frosted lens strip underneath, moulded
// end caps, the driver box riding on the fins, V-wire hangers with gripper
// adjusters up to the galvanised truss chord, the mains lead looping up to a
// cable tie and a daisy-chain lead with its plug at the far end.
// Generic visualization geometry at about real size (130 mm wide, 1.2 to
// 2.0 m long), millimetres, Z up, bar along X, lens facing down.

meta({
  name: "greenhouse-grow-light-bar",
  license: 'CC0-1.0',
  title: "Greenhouse grow light bar",
  description: "Greenhouse LED top-light bar at about real size: extruded aluminium heat sink with cooling fins, frosted lens strip underneath, end caps, driver box with glands on the fins, V-wire hangers with gripper adjusters up to a galvanised truss chord with clamps, mains lead looping up to a cable tie and a daisy-chain lead with plug. Material controls: heat sink, lens, driver and end caps, truss chord, plus a 1.2, 1.6 or 2.0 m length. anodised, blackHousing, lit and weathered presets.",
  tags: ['grow light', 'led', 'top light', 'lighting', 'heat sink', 'greenhouse lighting', 'supplemental lighting', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('heatSink', '#b9bfc3', { label: 'Heat sink (anodised aluminium)' });
const lens = param('lens', '#f1eee4', { label: 'Lens (frosted polycarbonate)' });
const driver = param('driver', '#2b2f33', { label: 'Driver and end caps (polymer)' });
const truss = param('truss', '#a9b0b3', { label: 'Truss chord (galvanised steel)' });
const length = param('length', '1.6 m', { choices: ['1.2 m', '1.6 m', '2.0 m'], label: 'Bar length' });

presets({
  anodised: { heatSink: '#b9bfc3', lens: '#f1eee4', driver: '#2b2f33', truss: '#a9b0b3' },
  blackHousing: { heatSink: '#2f3336', lens: '#e8e6dc', driver: '#1d2023', truss: '#8c969b' },
  lit: { heatSink: '#c9ced1', lens: '#e070c8', driver: '#3b3f42', truss: '#a9b0b3' },
  weathered: { heatSink: '#9a9e98', lens: '#d8d0b4', driver: '#4a4d48', truss: '#8b8a80' },
});

const p = assembly("greenhouse-grow-light-bar");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// A (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const L = length.value === '1.2 m' ? 1200 : length.value === '2.0 m' ? 2000 : 1600;
const ZF = 70; // fin tips
const ZC = 760; // truss chord centre line

// Heat sink: base plate with seven fins, one extruded profile.
const FT = 8;
const fy = (i: number) => -65 + (i * (130 - FT)) / 6;
const sink: [number, number][] = [[-65, 10], [65, 10], [65, ZF]];
for (let i = 6; i >= 0; i--) {
  sink.push([fy(i), ZF]);
  if (i > 0) sink.push([fy(i), 28], [fy(i - 1) + FT, 28], [fy(i - 1) + FT, ZF]);
}
add("heat-sink", profileYZ(sink, L).color(housing));
add("lens", profileYZ([[-58, 10], [58, 10], [52, 0], [-52, 0]], L).color(lens));
for (const sx of [-1, 1]) {
  add(`end-cap-${sx > 0 ? 'r' : 'l'}`, blk(sx * (L / 2 + 12), 0, 0, 24, 142, ZF + 4).color(driver));
  add(`end-screw-${sx > 0 ? 'r' : 'l'}`, cylX(sx > 0 ? L / 2 + 24 : -L / 2 - 30, 0, 40, 6, 8, 8).color('#8f989e'));
}

// Driver box riding on the fins, with glands and its label.
add("driver", extrudeRoundedRect(320, 112, 16, 58).translate(0, 0, ZF).color(driver));
add("driver-label", blk(-40, -57, ZF + 14, 140, 2, 30).color('#e6e8e8'));
add("gland-mains", cylX(160, 0, ZF + 29, 26, 13, 10).color('#5a6066'));
add("gland-out", cylX(-186, 0, ZF + 29, 26, 13, 10).color('#5a6066'));

// V-wire hangers with gripper adjusters, hooked over the truss chord.
for (const sx of [-1, 1]) {
  const x = sx * (L / 2 - 180);
  const t = sx > 0 ? 'r' : 'l';
  add(`clip-${t}`, blk(x, 0, ZF, 44, 136, 12).color('#8f989e'));
  for (const sy of [-1, 1]) add(`wire-${t}-${sy > 0 ? 'b' : 'f'}`, rod([x, sy * 60, ZF + 12], [x, 0, ZC - 130], 2.5, 5).color('#c9ced1'));
  add(`gripper-${t}`, cylZ(x, 0, ZC - 140, 70, 9, 8).color('#c9a43a'));
  add(`wire-${t}-top`, rod([x, 0, ZC - 70], [x, -8, ZC - 30], 2.5, 5).color('#c9ced1'));
  add(`hook-${t}`, cylX(x - 20, 0, ZC, 40, 30, 10).subtract(cylX(x - 30, 0, ZC, 60, 24, 10)).color('#8f989e'));
}

// Truss bottom chord with clamps and the first web members.
add("chord", cylX(-L / 2 - 250, 0, ZC, L + 500, 24, 12).color(truss));
for (const sx of [-1, 1]) {
  add(`web-${sx > 0 ? 'r' : 'l'}`, rod([sx * (L / 2 + 150), 0, ZC + 20], [sx * (L / 2 - 60), 0, ZC + 360], 16, 8).color(truss));
  add(`web-clamp-${sx > 0 ? 'r' : 'l'}`, cylX(sx * (L / 2 + 150) - 30, 0, ZC, 60, 30, 10).color('#8f989e'));
}

// Mains lead looping up to a cable tie; daisy-chain lead with its plug.
add("mains-a", rod([186, 0, ZF + 29], [300, -10, ZF + 60], 7).color('#22262a'));
add("mains-b", rod([300, -10, ZF + 60], [400, -14, ZF + 240], 7).color('#22262a'));
add("mains-c", rod([400, -14, ZF + 240], [430, -10, ZC - 30], 7).color('#22262a'));
add("cable-tie", cylX(418, 0, ZC, 24, 28, 10).color('#22262a'));
add("chain-a", rod([-186, 0, ZF + 29], [-L / 2 + 120, -20, ZF + 20], 6).color('#22262a'));
add("chain-b", rod([-L / 2 + 120, -20, ZF + 20], [-L / 2 + 40, -30, ZF + 120], 6).color('#22262a'));
add("chain-plug", cylZ(-L / 2 + 40, -30, ZF + 120, 70, 16, 10).color('#3b3f42'));
add("chain-plug-cap", cylZ(-L / 2 + 40, -30, ZF + 190, 12, 12, 10).color('#e8862b'));

return p.model();
