// SPDX-License-Identifier: CC0-1.0
// Landfill liner roll: a factory roll of HDPE geomembrane being deployed
// across a prepared landfill cell. What makes it a liner roll rather than a
// drum: a long black roll on a steel spreader bar through its cardboard core,
// the bar resting in the saddles of two A-frame unrolling stands, orange
// lifting straps and a manufacturer's label on the roll, and a sheet already
// pulled off the bottom of the roll and laid flat on the subgrade with a
// double-track welded seam and sandbags holding its leading edge down.
// Generic visualization geometry at about real size (3 m roll, 760 mm
// diameter, sheet pulled 2.6 m), millimetres, Z up, sheet toward -Y.

meta({
  name: "landfill-liner-roll",
  license: 'CC0-1.0',
  title: "Landfill liner roll",
  description: "HDPE geomembrane liner roll at about real size: black roll on a spreader bar through its core, resting in two A-frame unrolling stands, lifting straps and roll label, and a sheet pulled off onto the subgrade with a welded seam and sandbags on its leading edge. Sheet pulled or still rolled. Material controls: liner, stands, straps and core. smoothBlack, texturedGreen, whiteSurface and geotextile presets.",
  tags: ["recycling", "landfill", "liner", "geomembrane", "HDPE", "roll", "spreader bar", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const liner = param('liner', '#1f2123', { label: 'Liner (HDPE sheet)' });
const stands = param('stands', '#e0a526', { label: 'Stands and spreader bar (paint)' });
const straps = param('straps', '#d77632', { label: 'Lifting straps (polyester)' });
const core = param('core', '#9a8a6c', { label: 'Roll core (card tube)' });
const sheetMode = param('sheet', 'pulled', { choices: ['pulled', 'rolled'], label: 'Sheet' });

presets({
  smoothBlack: { liner: '#1f2123', stands: '#e0a526', straps: '#d77632' },
  texturedGreen: { liner: '#3e5a3c', stands: '#e0a526', straps: '#d77632' },
  whiteSurface: { liner: '#d9d8d0', stands: '#5d6366', straps: '#2f68b0' },
  geotextile: { liner: '#8d8a80', stands: '#5d6366', straps: '#d77632', core: '#7a6e58' },
});

const p = assembly("landfill-liner-roll");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const alongX = (len: number, r: number, seg: number, x0: number, y: number, z: number) => cylinder(len, r, seg).rotateY(90).translate(x0, y, z);

// Roll on its spreader bar, lifted clear of the ground by the stands.
const L = 3000, R = 380, AZ = R + 160;
add("liner-roll", alongX(L, R, 32, -L / 2, 0, AZ).color(liner));
add("roll-core", alongX(L + 160, 125, 16, -L / 2 - 80, 0, AZ).color(core));
add("spreader-bar", alongX(L + 900, 45, 12, -(L + 900) / 2, 0, AZ).color(stands));
for (const s of [-1, 1]) add(`bar-collar-${s < 0 ? 'l' : 'r'}`, alongX(40, 75, 12, s * (L / 2 + 110) - 20, 0, AZ).color(stands));

// Lifting straps and the manufacturer's label on the roll's front face.
for (const x of [-900, 900]) add(`strap-${x < 0 ? 'l' : 'r'}`, alongX(110, R + 5, 32, x - 55, 0, AZ).color(straps));
add("roll-label", box(420, 6, 240, true).rotateX(-32).translate(-250, -(R + 2) * Math.cos(Math.PI * 32 / 180), AZ + (R + 2) * Math.sin(Math.PI * 32 / 180)).color('#f2f0e6'));
add("label-band", box(420, 8, 50, true).rotateX(-32).translate(-250, -(R + 4) * Math.cos(Math.PI * 32 / 180), AZ + (R + 4) * Math.sin(Math.PI * 32 / 180) + 40).color(straps));

// A-frame unrolling stands with saddles under the bar.
for (const s of [-1, 1]) {
  const x = s * (L / 2 + 300), tag = s < 0 ? 'l' : 'r';
  for (const sy of [-1, 1]) {
    add(`stand-leg-${tag}-${sy < 0 ? 'f' : 'b'}`, rod([x, sy * 620, 40], [x, sy * 40, AZ - 50], 38).color(stands));
    add(`stand-foot-${tag}-${sy < 0 ? 'f' : 'b'}`, blk(x, sy * 640, 0, 220, 260, 40).color(stands));
  }
  add(`stand-tie-${tag}`, blk(x, 0, 220, 60, 820, 60).color(stands));
  add(`stand-saddle-${tag}`, blk(x, 0, AZ - 80, 140, 200, 60).subtract(alongX(200, 50, 12, x - 100, 0, AZ)).color(stands));
}

// Sheet pulled off the bottom of the roll and laid on the subgrade.
const SW = L - 40;
if (sheetMode.value === 'pulled') {
  const top: [number, number][] = [];
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    top.push([-R * 0.25 - t * 600, AZ - R + 8 - (AZ - R) * (1 - (1 - t) * (1 - t))]);
  }
  top.push([-2900, 10]);
  const under = top.map(([y, z]) => [y + 6, Math.max(z - 10, 0)] as [number, number]).reverse();
  add("liner-sheet", profileYZ([...top, ...under], SW).color(liner));
  add("weld-seam-a", blk(600, -1750, 10, 30, 2300, 4).color('#6c7074'));
  add("weld-seam-b", blk(650, -1750, 10, 30, 2300, 4).color('#6c7074'));
  add("seam-marker", blk(625, -2200, 14, 200, 120, 3).color('#f2f0e6'));
  for (const [k, x] of [-1200, -400, 400, 1200].entries()) {
    add(`sandbag-${k}`, sphere(160).scale([1.6, 1.0, 0.45]).rotateZ(k % 2 ? 8 : -6).translate(x, -2780, 10).subtract(blk(x, -2780, -200, 700, 500, 210)).color('#b39a6a'));
  }
} else {
  add("sheet-tail", profileYZ([[-R * 0.25, AZ - R + 6], [-R * 0.25 - 120, AZ - R - 140], [-R * 0.25 - 110, AZ - R - 150], [-R * 0.25 + 10, AZ - R]], SW).color(liner));
}

return p.model();
