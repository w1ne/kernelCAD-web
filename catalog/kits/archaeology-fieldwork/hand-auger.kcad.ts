// SPDX-License-Identifier: CC0-1.0
// Hand soil auger, the tool for coring through deposits to find the depth of
// archaeology before a trench is opened. What makes it one: a tall steel rod
// with a pointed screw tip and a three-turn helical flight that lifts soil;
// depth bands painted along the shaft; a pinned extension coupling; a T-handle
// with two timber grips; and the auger standing in its borehole with a ring
// of spoil around it and soil packed in the lower flights.
// Millimetres, Z up, ground on z = 0, auger axis on the origin.
meta({
  name: "hand-auger",
  license: 'CC0-1.0',
  title: "Hand soil auger",
  description: "Manual screw soil auger at real size standing in its borehole: pointed screw tip and cutting lips, a three-turn helical flight carrying packed soil, a steel shaft with painted 100 mm depth bands, a pinned extension coupling, a quick-coupling socket and a painted T-handle with two turned timber grips, plus a ring of spoil around the hole. Material controls: stainless steel, timber, painted steel, soil; fieldReady, weathered and clayRed presets.",
  tags: ["archaeology", "excavation", "fieldwork", "auger", "soil auger", "coring", "hand tool", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#aab4b6', { label: 'Stainless steel' });
const timber = param('timber', '#9a6c43', { label: 'Timber' });
const paintedSteel = param('paintedSteel', '#d9582b', { label: 'Painted steel' });
const soil = param('soil', '#6b5038', { label: 'Soil' });
presets({
  fieldReady: { stainlessSteel: '#c7cdcf', timber: '#a27850', paintedSteel: '#e0632e', soil: '#6f5640' },
  weathered: { stainlessSteel: '#7a8588', timber: '#705a45', paintedSteel: '#9b5a3a', soil: '#5b4a3a' },
  clayRed: { stainlessSteel: '#b8c0c2', timber: '#b08055', paintedSteel: '#2f6b9a', soil: '#9a4e32' },
});

const p = assembly("hand-auger");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X / Y: [[radius, x or y], ...] rising, centred on the other two axes.
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
const polar = (r, deg, z) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), z];

// ---- Borehole spoil ----
add('spoil-ring', lathe([[330, 0], [305, 22], [230, 55], [140, 80], [72, 72]], 20).color(soil));
for (let i = 0; i < 7; i++) {
  const [x, y] = polar(190 + (i % 3) * 50, i * 51 + 20, 0);
  add(`spoil-clod-${i}`, lathe([[34 + (i % 2) * 12, 40], [26, 80], [8, 95]], 7).translate(x, y, 10 - (i % 3) * 18).color(soil));
}

// ---- Screw tip and helical flight ----
const Z0 = 40, PITCH = 115, TURNS = 3, SEG = 20, R = 62, RS = 12;
add('screw-tip', lathe([[2, Z0 - 40], [18, Z0 + 10], [RS + 2, Z0 + 40]], 10).color(stainlessSteel));
for (let i = 0; i < TURNS * SEG; i++) {
  const a = (360 * i) / SEG;
  const z = Z0 + 40 + (PITCH * i) / SEG;
  const rMid = (RS + R) / 2;
  const tilt = (Math.atan(PITCH / (2 * Math.PI * rMid)) * 180) / Math.PI;
  const w = (2 * Math.PI * R) / SEG + 4;
  add(`flight-${i}`, blk(RS - 2, -w / 2, -2.5, R, w / 2, 2.5).rotateX(tilt).rotateZ(a).translate(0, 0, z).color(stainlessSteel));
  // Soil packed on the lower turn and a half.
  if (i < SEG * 1.5 && i % 2 === 0) {
    add(`packed-soil-${i}`, blk(RS, -w / 2, 2, R - 6, w / 2, 22 - (i % 4) * 3).rotateX(tilt).rotateZ(a).translate(0, 0, z).color(soil));
  }
}
add('cutting-lip-a', blk(RS, -4, Z0 + 26, R + 4, 4, Z0 + 42).rotateZ(-20).color(stainlessSteel));
add('cutting-lip-b', blk(-R - 4, -4, Z0 + 26, -RS, 4, Z0 + 42).rotateZ(-20).color(stainlessSteel));

// ---- Shaft, depth bands and couplings ----
const FT = Z0 + 40 + PITCH * TURNS; // flight top
add('shaft-lower', rod(RS, FT - 30, 720, 10).color(stainlessSteel));
for (let z = FT + 60; z < 700; z += 100) add(`depth-band-${z}`, rod(RS + 1.2, z, z + 12, 10).color(paintedSteel));
add('extension-coupling', lathe([[19, 700], [21, 712], [21, 780], [19, 792]], 12).color(stainlessSteel));
add('coupling-pin', latheX([[4, -30], [4, 30]], 0, 746, 8).color(paintedSteel));
add('coupling-pin-ring', latheY([[11, -2], [11, 2]], 31, 746, 10).color(stainlessSteel));
add('shaft-upper', rod(RS, 790, 1060, 10).color(stainlessSteel));
for (let z = 840; z < 1040; z += 100) add(`depth-band-${z}`, rod(RS + 1.2, z, z + 12, 10).color(paintedSteel));
add('quick-coupling', lathe([[20, 1050], [22, 1060], [22, 1120], [26, 1130], [26, 1160]], 12).color(paintedSteel));

// ---- T-handle ----
const HZ = 1185;
add('tee-socket', latheX([[30, -70], [30, 70]], 0, HZ, 12).color(paintedSteel));
add('tee-bar', latheX([[16, -310], [16, 310]], 0, HZ, 10).color(paintedSteel));
for (const s of [-1, 1]) {
  const x0 = s > 0 ? 95 : -295, x1 = s > 0 ? 295 : -95;
  add(`grip-${s}`, latheX([[24, x0], [28, x0 + 30], [29, (x0 + x1) / 2], [28, x1 - 30], [24, x1]], 0, HZ, 12).color(timber));
  add(`grip-cap-${s}`, latheX(s > 0 ? [[20, 295], [20, 310], [14, 318]] : [[14, -318], [20, -310], [20, -295]], 0, HZ, 10).color(paintedSteel));
}

return p.model();
