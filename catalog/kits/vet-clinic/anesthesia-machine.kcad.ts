// SPDX-License-Identifier: CC0-1.0
// Veterinary anaesthesia machine, the mobile gas workstation parked beside a
// surgery table. What makes one: a castored cabinet with drawers and a
// stainless worktop, a back panel carrying the flowmeter bank of glass tubes
// with bobbins and colour-coded knobs, a vaporizer in the agent colour
// (purple isoflurane or yellow sevoflurane), two pressure gauges, a side-mounted
// CO2 absorber canister of white soda lime turning violet, a black rubber
// reservoir bag on its arm, blue corrugated breathing hoses to a Y-piece, green
// oxygen cylinders hanging on rear yokes and a patient monitor on top.
// The agent choice swaps the vaporizer between isoflurane and sevoflurane.
// Millimetres, Z up, front on -Y.
meta({
  name: "anesthesia-machine",
  license: 'CC0-1.0',
  title: "Veterinary anesthesia machine",
  description: "Mobile veterinary anaesthesia workstation at real size: castored drawer cabinet with stainless worktop and accessory rail, flowmeter bank with glass tubes and colour-coded knobs, agent-coloured vaporizer, pressure gauges, side CO2 absorber with soda lime, reservoir bag, blue corrugated breathing hoses to a Y-piece, rear oxygen cylinders on yokes and a top patient monitor. Agent choice (isoflurane, sevoflurane) recolours the vaporizer. Material controls: cabinet paint, stainless trim, rubber and monitor glass. clinicClean, softTeal and graphite presets.",
  tags: ["veterinary", "animal clinic", "anesthesia", "anaesthesia machine", "vaporizer", "flowmeter", "surgery", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const agent = param('agent', 'isoflurane', { choices: ['isoflurane', 'sevoflurane'], label: 'Vaporizer agent' });
const cabinet = param('cabinet', '#e3e8e6', { label: 'Cabinet paint' });
const trim = param('trim', '#b9c2c4', { label: 'Stainless trim' });
const rubber = param('rubber', '#26292b', { label: 'Rubber' });
const glass = param('glass', '#2b4652', { label: 'Monitor glass' });

presets({
  clinicClean: { cabinet: '#f1f3f1', trim: '#c8cfd0' },
  softTeal: { cabinet: '#7fb0b2', trim: '#a9bbbd', glass: '#22404a' },
  graphite: { cabinet: '#4a5054', trim: '#9aa3a6', rubber: '#1d1f20', glass: '#1c2a31' },
});

const p = assembly("anesthesia-machine");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// Runs from y toward -Y (faces the front).
const cylF = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const tube = (a: number[], b: number[], r: number, seg = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return cylinder(len, r, seg)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const turned = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const agentPaint = agent.value === 'sevoflurane' ? '#e0b21e' : '#7a4fa3';
const o2Green = '#2e8b4a', airYellow = '#e6c229', n2oBlue = '#3d6fb5', hoseBlue = '#5b8fc4', sodaLime = '#ece8f0', limeSpent = '#9b7cc4';

// ---- Cart and cabinet ----
for (const [i, [x, y]] of [[-290, -230], [290, -230], [-290, 230], [290, 230]].entries()) {
  add(`castor-fork-${i}`, blk(x - 24, y - 30, 58, x + 24, y + 30, 135).color(trim));
  add(`castor-wheel-${i}`, cylX(x - 17, y, 50, 34, 50).color(rubber));
}
add('plinth', blk(-340, -280, 135, 340, 280, 195).color(cabinet));
add('bumper', blk(-356, -296, 145, 356, 296, 180).color(rubber));
add('cabinet-body', blk(-320, -250, 195, 320, 250, 815).color(cabinet));
for (const [k, [z0, z1]] of [[215, 420], [430, 620], [630, 800]].entries()) {
  add(`drawer-${k}`, blk(-300, -262, z0, 300, -250, z1).color(cabinet));
  add(`drawer-pull-${k}`, blk(-110, -280, z1 - 46, 110, -262, z1 - 28).color(trim));
}
add('worktop', blk(-360, -300, 815, 360, 300, 845).color(trim));
add('worktop-lip-back', blk(-360, 260, 845, 360, 300, 885).color(trim));
for (const s of [-1, 1]) add(`worktop-lip-${s < 0 ? 'left' : 'right'}`, blk(s * 360 - 20, -300, 845, s * 360 + 20, 300, 885).color(trim));
add('accessory-rail', cylX(-380, -312, 795, 760, 13, 10).color(trim));

// ---- Upright frame and back panel ----
for (const s of [-1, 1]) add(`upright-${s < 0 ? 'left' : 'right'}`, blk(s * 300 - 25, 175, 845, s * 300 + 25, 235, 1540).color(trim));
add('back-panel', blk(-280, 190, 845, 280, 222, 1500).color(cabinet));
add('top-shelf', blk(-350, -110, 1500, 350, 270, 1535).color(cabinet));

// Flowmeter bank: glass tubes with bobbins and colour-coded flow knobs.
add('flowmeter-housing', blk(-150, 150, 1030, 60, 190, 1420).color(cabinet));
add('flowmeter-window', blk(-135, 140, 1090, 45, 150, 1395).color(glass));
for (const [k, [x, knob, bob]] of [[-100, o2Green, 1290], [-45, airYellow, 1210], [10, n2oBlue, 1150]].entries()) {
  add(`flow-tube-${k}`, cylZ(x as number, 132, 1100, 285, 13, 12).color('#d6e6ea'));
  add(`flow-bobbin-${k}`, sphere(12).translate(x as number, 132, bob as number).color(knob as string));
  add(`flow-knob-${k}`, cylF(x as number, 150, 1060, 34, 18, 12).color(knob as string));
}
add('o2-flush-button', cylF(-120, 190, 980, 22, 20, 12).color(o2Green));

// Vaporizer on the back bar, in the agent colour.
add('vaporizer-mount', blk(90, 150, 1110, 280, 190, 1135).color(trim));
add('vaporizer-body', blk(110, 70, 1135, 260, 185, 1350).color(agentPaint));
add('vaporizer-dial', cylZ(185, 128, 1350, 40, 68, 22).color(agentPaint));
add('vaporizer-dial-grip', cylZ(185, 128, 1390, 18, 28, 12).color(trim));
add('vaporizer-sight-glass', blk(150, 62, 1170, 220, 72, 1240).color(glass));
add('vaporizer-fill-port', cylF(185, 70, 1280, 30, 18, 12).color(trim));

// Pressure gauges on the upper panel.
for (const [k, x] of [-200, 200].entries()) {
  add(`gauge-bezel-${k}`, cylF(x, 190, 1450, 22, 48, 20).color(trim));
  add(`gauge-face-${k}`, cylF(x, 168, 1450, 4, 40, 20).color('#f4f4ee'));
  add(`gauge-needle-${k}`, blk(-3, -4, 0, 3, 0, 34).rotateY(k ? 35 : -40).translate(x, 164, 1450).color('#c0392b'));
}

// ---- CO2 absorber, reservoir bag and breathing circuit ----
add('absorber-pole', cylZ(-400, -60, 845, 420, 16, 10).color(trim));
add('absorber-arm', blk(-400, -75, 900, -320, -45, 930).color(trim));
add('absorber-base', turned([[0, 0], [95, 0], [95, 40], [0, 40]]).translate(-400, -150, 930).color(cabinet));
add('absorber-canister-lower', cylZ(-400, -150, 970, 130, 82, 18).color(limeSpent));
add('absorber-canister-upper', cylZ(-400, -150, 1100, 130, 82, 18).color(sodaLime));
add('absorber-head', turned([[0, 0], [95, 0], [95, 50], [40, 75], [0, 75]]).translate(-400, -150, 1230).color(cabinet));
add('apl-valve', cylZ(-340, -200, 1300, 34, 22, 12).color('#d9d9d2'));
add('bag-arm', tube([-400, -150, 1300], [-500, 80, 1260], 12, 8).color(trim));
add('bag-neck', cylZ(-500, 80, 1110, 150, 18, 12).color(rubber));
add('reservoir-bag', sphere(105).scale([1, 1, 1.45]).translate(-500, 80, 980).color(rubber));
const hose = (name: string, pts: number[][]) => {
  for (let k = 0; k < pts.length - 1; k++) add(`${name}-${k}`, tube(pts[k], pts[k + 1], 15, 10).color(hoseBlue));
  for (let k = 1; k < pts.length - 1; k++) add(`${name}-joint-${k}`, sphere(15).translate(pts[k][0], pts[k][1], pts[k][2]).color(hoseBlue));
};
hose('inspiratory-hose', [[-440, -230, 1180], [-480, -380, 1060], [-420, -520, 930], [-250, -560, 900]]);
hose('expiratory-hose', [[-360, -230, 1180], [-380, -390, 1080], [-320, -520, 960], [-250, -560, 900]]);
add('y-piece', cylF(-250, -560, 900, 70, 20, 12).color('#d9d9d2'));

// ---- Gas cylinders on rear yokes ----
for (const [k, x] of [-170, 170].entries()) {
  add(`cylinder-yoke-${k}`, blk(x - 70, 250, 860, x + 70, 300, 900).color(trim));
  add(`oxygen-cylinder-${k}`, turned([[0, 0], [52, 0], [55, 20], [55, 560], [40, 620], [16, 640], [0, 640]], 16).translate(x, 360, 240).color(o2Green));
  add(`cylinder-valve-${k}`, cylZ(x, 360, 880, 60, 18, 10).color(trim));
  add(`cylinder-strap-${k}`, blk(x - 62, 296, 620, x + 62, 302, 650).color(rubber));
}

// ---- Patient monitor on top ----
add('monitor-post', cylZ(0, 60, 1535, 70, 26, 12).color(trim));
// Monitor parts are built about the tilt pivot and tipped back 8 degrees.
const M = (s: Shape) => s.rotateX(-8).translate(0, 40, 1600);
add('monitor-housing', M(blk(-190, -40, 0, 190, 30, 260)).color(cabinet));
add('monitor-screen', M(blk(-165, -48, 25, 165, -38, 235)).color(glass));
for (const [k, [z, c]] of [[190, '#38d36b'], [140, '#f0d33a'], [90, '#41b6e6']].entries()) {
  add(`monitor-trace-${k}`, M(blk(-150, -54, (z as number) - 3, 90, -46, (z as number) + 3)).color(c as string));
}

return p.model();
