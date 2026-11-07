// SPDX-License-Identifier: CC0-1.0
// Round stainless laboratory exhaust riser, floor stand to discharge nozzle.
// What makes it an exhaust riser rather than a post: a 400 mm round duct
// assembled from flanged sections, standing on a braced floor stand over a
// drain sump with a condensate valve, a flanged branch inlet from the hoods,
// a motorised backdraft damper section with its actuator box, a bolted
// access door, wall brackets, airflow-direction bands and a tapered
// high-velocity discharge nozzle at the top. Generic visualization geometry
// at real size (about 3.0 m tall), millimetres, Z up, stand feet on z = 0.
meta({
  name: 'fume-exhaust-riser',
  license: 'CC0-1.0',
  title: 'Fume exhaust riser',
  description: 'Round flanged stainless exhaust riser: braced floor stand over a drain sump with condensate valve, flanged branch inlet, motorised backdraft damper with actuator, bolted access door, wall brackets, airflow-direction bands and a tapered discharge nozzle. Material controls: duct stainless, stand and bracket enamel, flange steel, actuator and label polymer. Cleanroom, high-visibility and PVC-duct presets.',
  tags: ['exhaust riser', 'fume exhaust', 'duct', 'damper', 'ventilation', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const stainless = param('stainless', '#b8c7ca', { label: 'Duct stainless' });
const enamel = param('enamel', '#c9dedc', { label: 'Stand and bracket enamel' });
const steel = param('steel', '#53666e', { label: 'Flange and bolt steel' });
const polymer = param('polymer', '#e5a331', { label: 'Actuator and airflow-label polymer' });
presets({
  cleanroom: { stainless: '#d0d9d8', enamel: '#e7f0ed', steel: '#75888d', polymer: '#23a5a2' },
  highVisibility: { stainless: '#8fa0a4', enamel: '#ffe000', steel: '#33464d', polymer: '#d8352a' },
  pvcDuct: { stainless: '#8d9498', enamel: '#3e4a52', steel: '#5f676b', polymer: '#f08a1c' },
});

const p = assembly('fume-exhaust-riser');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Solid from an (x, z) front profile, `t` thick from y = 0 towards -Y.
const frontProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90);
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
// Round bar from p0 to p1.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const R = 200;
const Z0 = 560;
const NSEG = 20;
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);

// Braced floor stand: four legs, ring plate and diagonal braces.
for (let i = 0; i < 4; i += 1) {
  const a = (Math.PI / 4) + (i * Math.PI) / 2;
  const fx = 340 * Math.cos(a);
  const fy = 340 * Math.sin(a);
  const tx = 230 * Math.cos(a);
  const ty = 230 * Math.sin(a);
  add(`stand-leg-${i}`, rod([fx, fy, 12], [tx, ty, Z0 - 60], 22, 6).color(enamel));
  add(`leg-pad-${i}`, box(110, 110, 12, true).translate(fx, fy, 6).color(steel));
  const b = a + Math.PI / 2;
  add(`stand-brace-${i}`, rod([fx * 0.75, fy * 0.75, 140], [280 * Math.cos(b), 280 * Math.sin(b), 140], 12, 6).color(enamel));
}
add('stand-ring', ring(0, 270, Z0 - 70, Z0 - 50).color(enamel));

// Drain sump with a conical bottom and condensate valve.
add('drain-sump', turned([[0, Z0 - 220], [40, Z0 - 220], [R, Z0 - 90], [R, Z0 + 40], [0, Z0 + 40]]).color(stainless));
add('drain-pipe', rod([0, 0, Z0 - 220], [0, 0, Z0 - 330], 20, 8).color(stainless));
add('drain-valve', box(60, 60, 50, true).translate(0, 0, Z0 - 355).color(steel));
add('drain-lever', box(16, 120, 12, true).translate(0, -60, Z0 - 335).color(polymer));

// Flanged duct sections.
const joints = [Z0 + 40, 1300, 1900, 2350];
for (let i = 0; i < joints.length - 1; i += 1) {
  add(`duct-${i}`, cylinder(joints[i + 1] - joints[i], R, NSEG).translate(0, 0, joints[i]).color(stainless));
}
for (const z of joints) {
  add(`flange-${z}`, ring(R - 2, R + 32, z - 10, z + 10).color(steel));
}

// Branch inlet from the hood exhaust header.
const BZ = 900;
add('branch-inlet', cylinder(360, 130, 16).rotateX(90).translate(0, -R + 60, BZ).color(stainless));
add('branch-flange', ring(128, 158, 0, 18).rotateX(90).translate(0, -R - 290, BZ).color(steel));
add('branch-collar', ring(128, 150, 0, 30).rotateX(90).translate(0, -R + 10, BZ).color(steel));

// Backdraft damper section: actuator box, linkage and position indicator.
const DZ = 1600;
add('damper-shaft', rod([R, 0, DZ], [R + 90, 0, DZ], 12, 8).color(steel));
add('damper-actuator', box(110, 160, 190, true).translate(R + 145, 0, DZ).color(polymer));
add('actuator-cover', box(8, 120, 120, true).translate(R + 204, 0, DZ + 10).color(steel));
add('damper-indicator', box(10, 90, 14, true).rotateX(30).translate(R + 92, 0, DZ + 70).color(steel));

// Bolted access door on the duct face.
add('access-door', box(220, 30, 300, true).translate(0, -R - 4, 2120).color(stainless));
for (const [dx, dz] of [[-90, -130], [90, -130], [-90, 130], [90, 130]]) {
  add(`door-knob-${dx}-${dz}`, rod([dx, -R - 19, 2120 + dz], [dx, -R - 45, 2120 + dz], 10, 6).color(steel));
}

// Wall brackets on the +Y side.
for (const z of [1450, 2250]) {
  add(`bracket-band-${z}`, ring(R, R + 10, z - 30, z + 30).color(enamel));
  add(`bracket-arm-${z}`, box(60, 260, 40, true).translate(0, R + 130, z).color(enamel));
  add(`bracket-plate-${z}`, box(200, 12, 160, true).translate(0, R + 266, z).color(steel));
}

// Airflow-direction label bands.
for (const z of [1150, 1800]) {
  add(`airflow-band-${z}`, ring(R, R + 3, z - 40, z + 40).color(polymer));
  add(`airflow-arrow-${z}`, frontProfile([[-35, -20], [0, 25], [35, -20], [14, -20], [14, -40], [-14, -40], [-14, -20]], 4).translate(0, -R - 1, z).color(steel));
}

// Tapered high-velocity discharge nozzle with a stack band.
add('discharge-nozzle', turned([[0, 0], [R, 0], [R - 70, 330], [0, 330]]).translate(0, 0, joints[joints.length - 1]).color(stainless));
add('nozzle-throat', turned([[0, 330], [R - 80, 330], [R - 80, 333], [0, 333]]).translate(0, 0, joints[joints.length - 1]).color(steel));
add('stack-band', ring(R - 28, R - 14, 140, 180).translate(0, 0, joints[joints.length - 1]).color(polymer));

return p.model();
