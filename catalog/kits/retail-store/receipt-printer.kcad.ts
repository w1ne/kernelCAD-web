// SPDX-License-Identifier: CC0-1.0
// Receipt printer: the thermal POS printer beside every till.
// What makes it a receipt printer rather than a box: a rounded clamshell
// body whose lid sweeps down to a tear-bar paper slot at the front, a
// printed receipt curling out of that slot, a lid-release button and power,
// error and paper LEDs on the front, and (with the lid open) the paper roll
// sitting in its cradle. Generic visualization geometry at about real size
// (145 x 195 x 145 mm), millimetres, Z up, front toward -Y, feet on z = 0.

meta({
  name: "receipt-printer",
  license: 'CC0-1.0',
  title: "Receipt printer",
  description: "Thermal POS receipt printer at about real size: rounded clamshell body with the lid sweeping down to a serrated tear-bar paper slot, a printed receipt curling out of the slot, lid-release button and status LEDs, and with the lid open the paper roll in its cradle. Material controls: body plastic, lid plastic, paper, accent button. charcoal, white and kitchen presets; lid open or closed.",
  tags: ['receipt printer', 'thermal printer', 'pos printer', 'till printer', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2e3236', { label: 'Body plastic' });
const lid = param('lid', '#43494f', { label: 'Lid plastic' });
const paper = param('paper', '#f4f2ea', { label: 'Receipt paper' });
const accent = param('accent', '#3a8fd0', { label: 'Accent button' });
const lidState = param('lidState', 'closed', { choices: ['closed', 'open'], label: 'Lid' });

presets({
  charcoal: { body: '#2e3236', lid: '#43494f', paper: '#f4f2ea', accent: '#3a8fd0' },
  white: { body: '#e4e6e6', lid: '#f2f3f2', paper: '#f8f6ee', accent: '#8a9196' },
  kitchen: { body: '#1d1f21', lid: '#2a2d30', paper: '#f2e78c', accent: '#d2462f' },
});

const p = assembly("receipt-printer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const arc = (cy: number, cz: number, r: number, a0: number, a1: number, n: number) => {
  const pts: number[][] = [];
  for (let k = 0; k <= n; k++) {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return pts;
};

const W = 145;
const OPEN = lidState.value === 'open';

// Lower body: flat back, front face stepping in under the slot.
const lower: number[][] = [[-90, 6], [97, 6], [97, 92], [-60, 92], [-78, 70], [-90, 40]];
const shell = profileYZ(lower, W);
add("body", (OPEN ? shell.subtract(blk(0, 30, 40, W - 20, 110, 60)) : shell).color(body));
for (const x of [-55, 55]) {
  for (const y of [-70, 80]) add(`foot-${x < 0 ? "l" : "r"}-${y < 0 ? "f" : "b"}`, cylinder(6, 9, 8).translate(x, y, 0).color('#151618'));
}

// Clamshell lid: rounded back, hinged at the rear top, front edge at the slot.
const lidPts: number[][] = [[-62, 92], [-52, 116], [-24, 136], [10, 146], ...arc(49, 100, 48, 90, 0, 6), [97, 92]];
const lidShape = profileYZ(lidPts, W - 6);
add("lid", (OPEN ? lidShape.translate(0, -97, -92).rotateX(-105).translate(0, 97, 92) : lidShape).color(lid));

// Tear bar and paper slot at the lid's front edge.
add("tear-bar", blk(0, -64, 90, W - 30, 6, 6).color('#9aa0a4'));
for (let i = 0; i < 12; i++) add(`tooth-${i}`, blk(-52 + i * 9.5, -67, 95, 3, 3, 4).color('#9aa0a4'));

// Receipt curling out of the slot: a few short paper segments.
if (!OPEN) {
  let y = -64;
  let z = 96;
  let a = 85;
  for (let i = 0; i < 6; i++) {
    const len = 24;
    const seg = blk(0, 0, 0, 76, 1.2, len).rotateX(90 - a).translate(0, y, z);
    add(`receipt-${i}`, seg.color(paper));
    y -= len * Math.cos((a * Math.PI) / 180);
    z += len * Math.sin((a * Math.PI) / 180);
    a -= 30;
  }
  // Printed lines on the hanging part.
  for (let i = 0; i < 4; i++) add(`print-${i}`, blk(-8 + (i % 2) * 6, -66.5, 100 + i * 7, 50 - (i % 2) * 18, 0.6, 2).color('#3a3d40'));
} else {
  // Paper roll in its cradle.
  add("cradle", profileYZ([...arc(30, 80, 44, 180, 360, 10), ...arc(30, 80, 40, 360, 180, 10)], W - 20).color('#1d1f21'));
  add("roll", cylinder(W - 70, 38, 18).rotateY(90).translate(-(W - 70) / 2, 30, 80).color(paper));
  add("roll-core", cylinder(W - 68, 10, 10).rotateY(90).translate(-(W - 68) / 2, 30, 80).color('#b88a5a'));
  add("paper-lead", blk(0, -24, 92, W - 70, 70, 1).color(paper));
}

// Front controls: lid-release button and status LEDs on the lower front.
add("release", cylinder(4, 9, 12).rotateX(90).translate(48, -70, 66).color(accent));
const leds = ['#46c46a', '#e0b43a', '#d2462f'];
leds.forEach((c, i) => add(`led-${i}`, blk(-58 + i * 12, -79, 64, 5, 2, 3).color(c)));
add("brand-badge", blk(0, -85, 50, 50, 1, 8).color('#9aa0a4'));

return p.model();
