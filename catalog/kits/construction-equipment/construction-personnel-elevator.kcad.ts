// SPDX-License-Identifier: CC0-1.0
// Construction personnel elevator: the rack-and-pinion site hoist bolted up
// the face of a building under construction, carrying the crew and their
// materials between floors.
// What makes it one rather than a box: a square lattice mast of tube chords,
// rungs and diagonal lacing with a toothed rack up one face, standard 1.5 m
// sections joined at flange frames and tied back to the building, a mesh-sided
// cage on spring buffers with a framed roof, roof guardrail and a landing gate,
// the drive unit of twin motors and gearboxes riding the rack on the cage
// roof, and a fenced base enclosure around the bottom of the run.
// Generic visualization geometry at real size (cage about 3.2 x 1.5 x 2.4 m),
// millimetres, Z up, base frame on z = 0, mast on the origin, cage on +Y.
meta({
  name: "construction-personnel-elevator",
  license: 'CC0-1.0',
  title: "Construction personnel elevator",
  description: "Rack-and-pinion construction hoist at real size: square lattice mast with tube chords, rungs, diagonal lacing and a toothed rack, 1.5 m sections with flange frames and a wall tie, mesh-sided cage on spring buffers with framed roof, roof guardrail and landing gate, twin-motor drive unit riding the rack, and a fenced base enclosure. Mast choice 4 or 6 sections. Material controls: cage paint, galvanised mast steel, mesh infill, drive unit paint; siteYellow, highVisibility and weathered presets.",
  tags: ['construction hoist', 'personnel elevator', 'rack and pinion', 'site hoist', 'mast', 'construction equipment', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 5200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const sections = param('sections', '4', { choices: ['4', '6'], label: 'Mast sections (1.5 m each)' });
const cagePaint = param('cagePaint', '#e2771e', { label: 'Cage paint' });
const mastSteel = param('mastSteel', '#a5adb0', { label: 'Galvanised mast steel' });
const meshInfill = param('meshInfill', '#5d666b', { label: 'Mesh infill' });
const drivePaint = param('drivePaint', '#2d5d8f', { label: 'Drive unit paint' });
presets({
  siteYellow: { cagePaint: '#e8b81f', drivePaint: '#3c4a55' },
  highVisibility: { cagePaint: '#f25c1f', meshInfill: '#2a2f33', drivePaint: '#e8c21f' },
  weathered: { cagePaint: '#a86c3b', mastSteel: '#8a8c86', meshInfill: '#4f504a', drivePaint: '#4f6577' },
});

const p = assembly('construction-personnel-elevator');
// Turned so the landing gate faces the default three-quarter view.
const add = (name, shape) => p.part(name, shape.rotateZ(180).scale(scale));

// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const N = Number(sections.value);
const SL = 1508;              // mast section length
const M = 325;                // half mast width (650 mm square)
const ZB = 300;               // top of base frame
const ZTOP = ZB + N * SL;     // mast head
const CL = 3200;              // cage length along X
const CW = 1500;              // cage width along Y
const CH = 2400;              // cage height
const Y0 = M + 220;           // cage inner face
const ZC = ZB + 420;          // cage floor (parked on the buffers)

// Base frame and fenced enclosure.
add('base-frame', box(CL + 900, CW + Y0 + M + 700, ZB, true).translate(0, (Y0 + CW - M) / 2, ZB / 2).color(mastSteel));
const EX = CL / 2 + 350;
const EY0 = -M - 250;
const EY1 = Y0 + CW + 350;
const fence = [[[-EX, EY0], [EX, EY0]], [[-EX, EY0], [-EX, EY1]], [[EX, EY0], [EX, EY1]]];
for (const [i, [a, b]] of fence.entries()) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  add(`enclosure-panel-${i}`, box(len, 8, 1200, true).rotateZ(ang).translate(mid[0], mid[1], ZB + 700).color(meshInfill));
  add(`enclosure-rail-${i}`, box(len, 40, 40, true).rotateZ(ang).translate(mid[0], mid[1], ZB + 1320).color(cagePaint));
  add(`enclosure-post-${i}a`, box(60, 60, 1320, true).translate(a[0], a[1], ZB + 660).color(cagePaint));
}
add('enclosure-post-end-left', box(60, 60, 1320, true).translate(-EX, EY1, ZB + 660).color(cagePaint));
add('enclosure-post-end-right', box(60, 60, 1320, true).translate(EX, EY1, ZB + 660).color(cagePaint));
for (const x of [-CL / 4, CL / 4]) {
  add(`buffer-spring-${x < 0 ? 'left' : 'right'}`, cylinder(380, 90, 10).translate(x, Y0 + CW / 2, ZB).color(drivePaint));
}

// Lattice mast: four chords, rungs and diagonal lacing per section, flange frames, rack.
for (const [i, [x, y]] of [[-M, -M], [M, -M], [M, M], [-M, M]].entries()) {
  add(`mast-chord-${i}`, rod([x, y, ZB], [x, y, ZTOP], 38, 8).color(mastSteel));
}
for (let s = 0; s < N; s++) {
  const z0 = ZB + s * SL;
  add(`mast-flange-${s}`, box(2 * M + 90, 2 * M + 90, 30, true).translate(0, 0, z0 + 15).color(mastSteel));
  add(`mast-flange-${s}-hole`, box(2 * M - 60, 2 * M - 60, 34, true).translate(0, 0, z0 + 15).color(meshInfill));
  for (const [f, [a, b]] of [[[-M, -M], [M, -M]], [[M, -M], [M, M]], [[-M, M], [-M, -M]]].entries()) {
    add(`mast-rung-${s}-${f}`, rod([a[0], a[1], z0 + SL / 2], [b[0], b[1], z0 + SL / 2], 18).color(mastSteel));
    add(`mast-lace-${s}-${f}-lo`, rod([a[0], a[1], z0 + 40], [b[0], b[1], z0 + SL / 2], 15).color(mastSteel));
    add(`mast-lace-${s}-${f}-hi`, rod([b[0], b[1], z0 + SL / 2], [a[0], a[1], z0 + SL - 40], 15).color(mastSteel));
  }
}
const ZM = ZB + 2 * SL;
add('mast-top-cap', box(2 * M + 90, 2 * M + 90, 30, true).translate(0, 0, ZTOP).color(mastSteel));
add('rack', box(60, 40, N * SL - 60, true).translate(0, M + 60, ZB + (N * SL) / 2).color(meshInfill));
for (let t = 0; t < N * 6; t++) {
  add(`rack-tooth-band-${t}`, box(66, 20, 120, true).translate(0, M + 85, ZB + 140 + t * (SL / 6)).color(mastSteel));
}
// Wall tie back to the building face on -Y.
add('wall-tie-arm', rod([-M, -M, ZM], [-M - 300, -M - 1400, ZM], 30).color(mastSteel));
add('wall-tie-arm-2', rod([M, -M, ZM], [M + 300, -M - 1400, ZM], 30).color(mastSteel));
add('wall-tie-plate', box(1400, 20, 400, true).translate(0, -M - 1410, ZM).color(mastSteel));

// Cage: corner posts, floor, roof, mesh walls, mid rails and landing gate.
const cy = Y0 + CW / 2;
add('cage-floor', box(CL, CW, 120, true).translate(0, cy, ZC + 60).color(cagePaint));
add('cage-roof', box(CL + 40, CW + 40, 80, true).translate(0, cy, ZC + CH).color(cagePaint));
for (const [i, [x, y]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) {
  add(`cage-post-${i}`, box(90, 90, CH, true).translate((x * CL) / 2 - x * 45, cy + (y * CW) / 2 - y * 45, ZC + CH / 2).color(cagePaint));
}
add('cage-wall-mast-side', box(CL - 180, 10, CH - 160, true).translate(0, Y0 + 20, ZC + CH / 2).color(meshInfill));
add('cage-wall-left', box(10, CW - 180, CH - 160, true).translate(-CL / 2 + 30, cy, ZC + CH / 2).color(meshInfill));
add('cage-wall-right', box(10, CW - 180, CH - 160, true).translate(CL / 2 - 30, cy, ZC + CH / 2).color(meshInfill));
add('cage-rail-left', box(30, CW, 70, true).translate(-CL / 2 + 15, cy, ZC + 1100).color(cagePaint));
add('cage-rail-right', box(30, CW, 70, true).translate(CL / 2 - 15, cy, ZC + 1100).color(cagePaint));
add('cage-rail-mast-side', box(CL, 30, 70, true).translate(0, Y0 + 5, ZC + 1100).color(cagePaint));
// Landing gate on the outer face: two framed leaves with mesh and a kick plate.
const yg = Y0 + CW + 10;
for (const [i, x] of [-CL / 4 + 20, CL / 4 - 20].entries()) {
  add(`gate-leaf-${i}-mesh`, box(CL / 2 - 140, 10, CH - 300, true).translate(x, yg, ZC + CH / 2 - 20).color(meshInfill));
  add(`gate-leaf-${i}-frame-top`, box(CL / 2 - 100, 50, 60, true).translate(x, yg + 10, ZC + CH - 160).color(cagePaint));
  add(`gate-leaf-${i}-kick`, box(CL / 2 - 100, 50, 260, true).translate(x, yg + 10, ZC + 260).color(cagePaint));
  add(`gate-leaf-${i}-mid`, box(CL / 2 - 100, 50, 60, true).translate(x, yg + 10, ZC + 1100).color(cagePaint));
}
add('gate-header', box(CL, 90, 120, true).translate(0, yg, ZC + CH - 60).color(cagePaint));
add('gate-handle', rod([-60, yg + 40, ZC + 1000], [-60, yg + 40, ZC + 1300], 16).color(mastSteel));
add('cage-sign', box(700, 6, 260, true).translate(0, yg + 40, ZC + CH - 60).color(mastSteel));

// Drive unit on the roof: frame riding the mast, twin motors with brakes on gearboxes.
const ZR = ZC + CH + 40;
const yd = M + 200;
add('drive-frame', box(1100, 300, 900, true).translate(0, yd + 30, ZR + 450).color(drivePaint));
add('drive-guide-rollers', box(2 * M + 40, 120, 700, true).translate(0, M + 10, ZR + 450).color(mastSteel));
for (const [i, z] of [ZR + 220, ZR + 680].entries()) {
  add(`drive-gearbox-${i}`, box(420, 260, 260, true).translate(-420, yd + 120, z).color(drivePaint));
  add(`drive-motor-${i}`, cylinder(380, 120, 12).rotateY(-90).translate(-630, yd + 120, z).color(drivePaint));
  add(`drive-brake-${i}`, cylinder(110, 95, 12).rotateY(-90).translate(-1010, yd + 120, z).color(meshInfill));
  add(`drive-pinion-${i}`, cylinder(160, 85, 12).rotateY(90).translate(-80, M + 190, z).color(mastSteel));
}
add('control-box', box(420, 200, 520, true).translate(700, yd + 120, ZR + 300).color(drivePaint));
// Roof guardrail with toe board.
const rl = [[-CL / 2 + 20, cy - CW / 2 + 20], [CL / 2 - 20, cy - CW / 2 + 20], [CL / 2 - 20, cy + CW / 2 - 20], [-CL / 2 + 20, cy + CW / 2 - 20]];
for (let i = 0; i < 4; i++) {
  const a = rl[i];
  const b = rl[(i + 1) % 4];
  add(`roof-post-${i}`, rod([a[0], a[1], ZR], [a[0], a[1], ZR + 1100], 22).color(cagePaint));
  if (i === 0) continue;
  add(`roof-rail-${i}`, rod([a[0], a[1], ZR + 1100], [b[0], b[1], ZR + 1100], 22).color(cagePaint));
  add(`roof-knee-rail-${i}`, rod([a[0], a[1], ZR + 550], [b[0], b[1], ZR + 550], 18).color(cagePaint));
}

return p.model();
