// SPDX-License-Identifier: CC0-1.0
// Peristaltic dosing pump: the multi-channel nutrient doser that meters part
// A, part B and pH-adjust concentrates into a reservoir, shown wall-mounted
// on a backboard above its concentrate bottles.
// What makes it a peristaltic doser: a row of round pump heads on the front
// of a control housing, each with a clear cover showing a three-roller rotor
// squeezing a loop of silicone tube; a small display and keys for the dosing
// programme; and suction tubes running down into labelled concentrate
// bottles with discharge tubes bundled off to the reservoir.
// Generic visualization geometry at real size (housing about 300 mm wide),
// millimetres, Z up, pump heads toward -Y.

meta({
  name: "peristaltic-dosing-pump",
  license: 'CC0-1.0',
  title: "Peristaltic dosing pump",
  description: "Multi-channel peristaltic nutrient doser at real size: control housing with display and keys, two or four round pump heads with clear covers over three-roller rotors and tube loops, suction tubes into labelled concentrate bottles (part A, part B, pH down, pH up) on a shelf, and a discharge bundle to the reservoir, all on a plywood backboard. Material controls: housing, pump heads, tubing and backboard, plus a channel count choice. greyIndustrial, whiteLab, growerGreen and weathered presets.",
  tags: ['dosing pump', 'peristaltic pump', 'nutrient doser', 'metering pump', 'fertigation', 'ph control', 'concentrate', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#55606a', { label: 'Housing (powder-coated steel)' });
const head = param('head', '#2a2d30', { label: 'Pump heads (polymer)' });
const tubing = param('tubing', '#e9e4d0', { label: 'Silicone tubing' });
const board = param('board', '#c9a46a', { label: 'Backboard (plywood)' });
const channels = param('channels', '4', { choices: ['2', '4'], label: 'Channels' });

presets({
  greyIndustrial: { housing: '#55606a', head: '#2a2d30', tubing: '#e9e4d0', board: '#c9a46a' },
  whiteLab: { housing: '#eceee9', head: '#3a6fa0', tubing: '#f2efe2', board: '#d6d2c6' },
  growerGreen: { housing: '#2f7a46', head: '#24282a', tubing: '#e9e4d0', board: '#b8925a' },
  weathered: { housing: '#6d6f68', head: '#3e403c', tubing: '#cfc49e', board: '#9a8462' },
});

const p = assembly("peristaltic-dosing-pump");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 18) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 14) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const n = Number(channels.value);
const PITCH = 95;
const HW = n * PITCH + 60; // housing width
const ZH = 520; // housing bottom
const HH = 260; // housing height
const HD = 110; // housing depth (from board face at y=0 toward -Y)
const ZHEAD = ZH + 90; // pump head axis

// Backboard and shelf.
const BW = Math.max(HW + 120, 520);
add("backboard", blk(0, 9, 0, BW, 18, 900).color(board));
add("shelf", blk(0, -110, 160, BW - 40, 220, 18).color(board));
add("shelf-bracket-l", blk(-BW / 2 + 50, -60, 60, 20, 120, 100).color(housing));
add("shelf-bracket-r", blk(BW / 2 - 50, -60, 60, 20, 120, 100).color(housing));
add("shelf-lip", blk(0, -215, 178, BW - 40, 10, 30).color(board));

// Control housing with display and keys on the top strip.
add("housing", extrudeRoundedRect(HW, HH, 18, HD, { axis: 'y' }).translate(0, -HD, ZH + HH / 2).color(housing));
add("face-plate", blk(0, -HD - 2, ZH + 12, HW - 24, 3, HH - 24).color(housing));
add("display-bezel", blk(-HW / 2 + 90, -HD - 5, ZH + HH - 70, 130, 4, 50).color('#1e2124'));
add("display", blk(-HW / 2 + 90, -HD - 6, ZH + HH - 64, 112, 2, 38).color('#6fb3d2'));
add("display-text", blk(-HW / 2 + 80, -HD - 7.2, ZH + HH - 50, 70, 1, 6).color('#f2f6f8'));
for (let k = 0; k < 4; k++) add(`key-${k}`, cylY(-HW / 2 + 185 + k * 28, -HD - 2, ZH + HH - 45, 6, 9, 10).color(k === 0 ? '#2a8a4a' : '#d9dcde'));
add("status-led", cylY(HW / 2 - 40, -HD - 2, ZH + HH - 45, 4, 5, 8).color('#4ad06a'));
add("power-gland", cylZ(HW / 2 - 40, -HD / 2, ZH - 30, 30, 10, 8).color('#1e2124'));
add("power-cable", rod([HW / 2 - 40, -HD / 2, ZH - 30], [BW / 2 - 20, -HD / 2 + 20, 260], 4).color('#1e2124'));

// Concentrate bottles on the shelf, one per channel.
const labels = [['#2a8a4a', 'A'], ['#c9a42a', 'B'], ['#c0392b', 'down'], ['#2f6fa8', 'up']].slice(0, n);
const bottleX = (i: number) => -((n - 1) * PITCH) / 2 + i * PITCH;
labels.forEach(([c], i) => {
  const x = bottleX(i);
  add(`bottle-${i}`, turned([[0, 0], [36, 0], [38, 6], [38, 160], [20, 190], [16, 205], [0, 205]]).translate(x, -110, 178).color('#f2f2ee'));
  add(`bottle-label-${i}`, cylinder(70, 38.8, 14).subtract(cylinder(80, 34, 14).translate(0, 0, -5)).translate(x, -110, 230).color(c));
  add(`bottle-cap-${i}`, cylZ(x, -110, 380, 22, 19, 12).color(c));
});

// Pump heads, each with a clear cover, rotor and tube loop.
for (let i = 0; i < n; i++) {
  const x = -((n - 1) * PITCH) / 2 + i * PITCH;
  const yf = -HD;
  add(`head-${i}`, cylY(x, yf, ZHEAD, 30, 40).color(head));
  // Tube loop around the rotor, as a ring of short segments inside the head.
  const segs = 10;
  for (let k = 0; k < segs; k++) {
    const a0 = Math.PI * (k / segs), a1 = Math.PI * ((k + 1) / segs);
    add(`loop-${i}-${k}`, rod([x + 29 * Math.cos(a0), yf - 38, ZHEAD - 29 * Math.sin(a0)], [x + 29 * Math.cos(a1), yf - 38, ZHEAD - 29 * Math.sin(a1)], 4.2, 5).color(tubing));
  }
  add(`rotor-${i}`, cylY(x, yf - 30, ZHEAD, 14, 16, 12).color('#c9ccce'));
  for (let r = 0; r < 3; r++) {
    const a = (r * 2 * Math.PI) / 3 + 0.3 * i;
    add(`roller-${i}-${r}`, cylY(x + 18 * Math.cos(a), yf - 30, ZHEAD + 18 * Math.sin(a), 14, 7, 10).color('#e6e8ea'));
  }
  add(`cover-rim-${i}`, cylY(x, yf - 30, ZHEAD, 18, 42, 20).subtract(cylY(x, yf - 28, ZHEAD, 24, 36, 20)).color(head));
  add(`cover-${i}`, cylY(x, yf - 46, ZHEAD, 2, 37, 20).color('#cfe3ea'));
  add(`hub-${i}`, cylY(x, yf - 48, ZHEAD, 6, 8, 10).color(head));
  add(`channel-tag-${i}`, blk(x, yf - 3, ZH + 20, 40, 2, 12).color(labels[i][0]));
  // Suction tube from the loop's left end down into the bottle.
  add(`suction-${i}`, rod([x - 29, yf - 38, ZHEAD], [x - 22, -110, 395], 3.4, 5).color(tubing));
  add(`dip-${i}`, cylZ(x - 22, -110, 360, 40, 3.4, 5).color(tubing));
  // Discharge tube from the right end, up and over to the bundle.
  add(`discharge-${i}`, rod([x + 29, yf - 38, ZHEAD], [x + 20, yf - 40, ZH + HH + 40], 3.4, 5).color(tubing));
  add(`discharge-run-${i}`, rod([x + 20, yf - 40, ZH + HH + 40], [HW / 2 + 30, -70, ZH + HH + 40 + i * 8], 3.4, 5).color(tubing));
}
add("discharge-bundle", rod([HW / 2 + 30, -70, ZH + HH + 50], [BW / 2 - 30, -40, ZH - 120], 12, 8).color('#1e2124'));
add("bundle-clip", blk(HW / 2 + 30, -40, ZH + HH + 30, 30, 60, 30).color(head));

return p.model();
