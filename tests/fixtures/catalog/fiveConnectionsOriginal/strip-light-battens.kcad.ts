// SPDX-License-Identifier: CC0-1.0
// Strip-light batten set: three cyc strip lights laid end to end as a ground
// row, each tilted up on its own floor trunnion stand.
// What makes it a strip light rather than a long box: a trapezoid trough
// housing with end caps, a row of round colour cells along the face that
// alternate warm and cool circuits, gel-frame runners down both edges, and
// a yoke stand at each end with a pivot knob, so the trough aims up at the
// cyclorama.
// Generic visualization geometry at about real size (1 m units, 3.4 m run),
// millimetres, Z up, lamp faces tipped toward -Y, standing on z = 0.

meta({
  name: "strip-light-battens",
  license: 'CC0-1.0',
  title: "Strip-light batten set",
  description: "Ground row of three 1 m cyc strip lights at about real size: trapezoid trough housings with end caps, eight round colour cells each alternating warm and cool circuits, gel-frame runners, rear connector box, and a floor trunnion stand with pivot knobs at each end tilting the trough up at the cyc. Material controls: housing, stand hardware, warm and cool colour cells. houseShow, touring and cycRGB presets.",
  tags: ['strip light', 'cyc light', 'ground row', 'border light', 'theatre lighting', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const housing = param('housing', '#2b3035', { label: 'Housing' });
const hardware = param('hardware', '#9aa3a8', { label: 'Stands, runners and knobs' });
const gelWarm = param('gelWarm', '#f2a43a', { label: 'Warm colour cells' });
const gelCool = param('gelCool', '#3f7fd8', { label: 'Cool colour cells' });

presets({
  houseShow: { housing: '#2b3035', hardware: '#9aa3a8', gelWarm: '#f2a43a', gelCool: '#3f7fd8' },
  touring: { housing: '#e0e2e0', hardware: '#3a4045', gelWarm: '#ffd35c', gelCool: '#2fb8c9' },
  cycRGB: { housing: '#16181a', hardware: '#6b747a', gelWarm: '#e0342c', gelCool: '#36b24a' },
});

const BLACK = '#17191b';

const p = assembly("strip-light-battens");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const alongX = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateY(90); // x from 0 to len

const L = 1000; // housing length
const PZ = 230; // pivot height
const TILT = 32; // face tipped toward -Y
const PITCH = 1130;
const CELLS = 8;

const trough = [[-62, -70], [62, -70], [92, 70], [-92, 70]];
const cap = [[-70, -80], [70, -80], [100, 80], [-100, 80]];

for (const [u, xc] of [["left", -PITCH], ["centre", 0], ["right", PITCH]] as [string, number][]) {
  const aim = (s: Shape) => s.rotateX(TILT).translate(xc, 0, PZ);

  add(`housing-${u}`, aim(profileYZ(trough, L)).color(housing));
  for (const [e, x] of [["l", -L / 2 - 10], ["r", L / 2 + 10]] as [string, number][])
    add(`end-cap-${u}-${e}`, aim(profileYZ(cap, 20).translate(x, 0, 0)).color(housing));

  // Face: a black baffle with round colour cells, gel runners each edge.
  add(`baffle-${u}`, aim(box(L - 20, 168, 8, true).translate(0, 0, 74)).color(BLACK));
  for (const [e, y] of [["front", -86], ["back", 86]] as [string, number][])
    add(`runner-${u}-${e}`, aim(box(L, 10, 14, true).translate(0, y, 82)).color(hardware));
  for (let i = 0; i < CELLS; i++) {
    const x = -L / 2 + L / CELLS * (i + 0.5);
    add(`cell-${u}-${i + 1}`, aim(cylinder(8, 52, 16).translate(x, 0, 76)).color(i % 2 === 0 ? gelWarm : gelCool));
  }

  // Connector box on the back of the trough.
  add(`connector-${u}`, aim(box(130, 60, 70, true).translate(L / 2 - 120, 0, -100)).color(BLACK));

  // Floor trunnion stand at each end: foot, upright, pivot knob.
  for (const [e, s] of [["l", -1], ["r", 1]] as [string, number][]) {
    const x = xc + s * (L / 2 + 38);
    add(`stand-foot-${u}-${e}`, box(60, 320, 14, true).translate(x, 0, 7).color(hardware));
    add(`stand-upright-${u}-${e}`, box(16, 50, PZ + 20, true).translate(x, 0, (PZ + 20) / 2 + 14).color(hardware));
    add(`pivot-knob-${u}-${e}`, alongX(36, 26, 14).translate(s > 0 ? x + 8 : x - 44, 0, PZ).color(BLACK));
  }
}

// Jumper cables linking the units along the floor.
for (const [j, x] of [["a", -PITCH / 2], ["b", PITCH / 2]] as [string, number][])
  add(`jumper-${j}`, alongX(220, 9, 8).translate(x - 110, 60, 9).color(BLACK));

return p.model();
