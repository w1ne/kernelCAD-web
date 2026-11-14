// SPDX-License-Identifier: CC0-1.0
// Compost aeration header: the forced-air manifold of an aerated static
// pile. What makes it that system rather than a pallet with a rail: a
// centrifugal blower on a skid drawing through an intake silencer, a large
// HDPE header pipe on saddle supports running across the end of the pile,
// lateral branches each with a butterfly valve and handwheel diving into
// the base of a long compost pile, a condensate drain leg at the low end, a
// pressure gauge on the header, a VFD panel on a post, and long temperature
// probes pushed into the pile with a solar-powered logger.
// Generic visualization geometry at about real size (pile 6 m long, 2.1 m
// high), millimetres, Z up, blower and panel on -Y.

meta({
  name: "compost-aeration-header",
  license: 'CC0-1.0',
  title: "Compost aeration header",
  description: "Aerated static pile manifold at about real size: centrifugal blower on a skid with intake silencer, HDPE header pipe on saddle supports, lateral branches with butterfly valves and handwheels running into the base of a compost pile, condensate drain leg, header pressure gauge, VFD panel on a post and temperature probes with a solar logger. Four or six laterals. Material controls: HDPE pipe, blower paint, compost and valve accent. organics, weathered, greyPipe and highVisibility presets.",
  tags: ["recycling", "composting", "aerated static pile", "blower", "manifold", "header", "pipework", "valve", "temperature probe", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pipe = param('pipe', '#2a2c2e', { label: 'Header and laterals (HDPE)' });
const blower = param('blower', '#2f6fb5', { label: 'Blower and panel (paint)' });
const compost = param('compost', '#5a4330', { label: 'Compost pile' });
const valve = param('valve', '#d8b23a', { label: 'Valves and handwheels (accent)' });
const laterals = param('laterals', 'six', { choices: ['four', 'six'], label: 'Lateral branches' });

presets({
  organics: { pipe: '#2a2c2e', blower: '#2f6fb5', compost: '#5a4330', valve: '#d8b23a' },
  weathered: { pipe: '#3a3936', blower: '#4f6478', compost: '#4a3a2c', valve: '#a88f3c' },
  greyPipe: { pipe: '#7b8085', blower: '#2f6b4f', compost: '#6b5038', valve: '#c8322a' },
  highVisibility: { pipe: '#2a2c2e', blower: '#e07a2a', compost: '#6e5236', valve: '#f5d000' },
});

const p = assembly("compost-aeration-header");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rodX = (x0: number, x1: number, y: number, z: number, r: number, seg = 12) => cylinder(x1 - x0, r, seg).rotateY(90).translate(x0, y, z);
const rodY = (x: number, y0: number, y1: number, z: number, r: number, seg = 12) => cylinder(y1 - y0, r, seg).rotateX(-90).translate(x, y0, z);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts: [number, number][], t: number) => profileXZ(pts, t).rotateZ(90);

// Compost pile: rounded cross-section along X, trimmed by sloped ends.
const PX0 = -1800, PX1 = 4600, PW = 4400, PH = 2100;
const cross = profileYZ([[-PW / 2, 0], [PW / 2, 0], [1600, 1300], [900, 1900], [0, PH], [-900, 1900], [-1600, 1300]], PX1 - PX0 + 200)
  .translate((PX0 + PX1) / 2, 0, 0);
const ends = profileXZ([[PX0, 0], [PX1, 0], [PX1 - 1600, PH + 50], [PX0 + 1600, PH + 50]], PW + 200);
add("compost-pile", cross.intersect(ends).color(compost));

// Wood-chip capping crumbs on the pile flank.
let seed = 23;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let k = 0; k < 24; k++) {
  const x = PX0 + 1900 + rnd() * (PX1 - PX0 - 3800), y = -PW / 2 + 80 + rnd() * 480;
  const z = ((y + PW / 2) / 600) * 1300;
  add(`crumb-${k}`, box(160 + rnd() * 140, 70, 40, true).rotateZ(rnd() * 180).rotateX(-60).translate(x, y - 20, z).color(k % 2 ? '#8a6440' : '#3f2f22'));
}

// Header pipe across the -X end of the pile on saddle supports.
const HX = PX0 - 1300, HZ = 380, HR = 180, HY0 = -2900, HY1 = 2000;
add("header", rodY(HX, HY0, HY1, HZ, HR, 16).color(pipe));
add("header-end-cap", rodY(HX, HY1, HY1 + 40, HZ, HR + 30, 16).color(pipe));
for (const y of [-2500, -1300, 0, 1300]) {
  add(`saddle-${y + 3000}`, blk(HX, y, 0, 420, 160, HZ - HR + 30).subtract(rodY(HX, y - 100, y + 100, HZ, HR, 16)).color('#9a958b'));
}
add("pressure-gauge-stem", cylinder(160, 15, 6).translate(HX, -1900, HZ + HR).color('#9aa1a4'));
add("pressure-gauge", cylinder(30, 70, 12).rotateX(90).translate(HX, -1885, HZ + HR + 220).color('#f2f2ee'));
add("drain-leg", cylinder(HZ - 60, 40, 8).translate(HX, HY1 - 150, 30).color(pipe));
add("drain-valve", blk(HX, HY1 - 150, 160, 120, 90, 90).color(valve));

// Laterals with butterfly valves into the pile base.
const n = laterals.value === 'four' ? 4 : 6;
for (let k = 0; k < n; k++) {
  const y = -PW / 2 + 500 + (k * (PW - 1000)) / (n - 1);
  add(`lateral-${k}`, rodX(HX, PX0 + 900, y, 200, 80, 10).color(pipe));
  add(`tee-${k}`, cylinder(HZ - 200 + 20, 85, 10).translate(HX, y, 190).color(pipe));
  add(`valve-body-${k}`, rodX(HX + 450, HX + 560, y, 200, 120, 12).color(valve));
  add(`valve-stem-${k}`, cylinder(220, 15, 6).translate(HX + 505, y, 300).color('#9aa1a4'));
  add(`handwheel-${k}`, torus(90, 14, 12).translate(HX + 505, y, 530).color(valve));
  add(`lateral-flange-${k}`, rodX(PX0 + 220, PX0 + 260, y, 200, 110, 10).color(pipe));
}

// Centrifugal blower on a skid at the -Y end, with intake silencer and VFD panel.
const BX = HX, BY = HY0 - 900;
add("blower-skid", blk(BX, BY, 0, 1600, 1100, 140).color('#2b2f33'));
add("blower-scroll", rodX(BX - 200, BX + 200, BY, 720, 560, 18).color(blower));
add("blower-outlet", blk(BX, BY + 450, 300, 400, 500, 420).color(blower));
add("outlet-reducer", rodY(BX, BY + 700, HY0, HZ, HR, 16).color(pipe));
add("flex-joint", rodY(BX, BY + 650, BY + 760, HZ, HR + 40, 16).color('#2b2f33'));
add("blower-motor", rodX(BX + 200, BX + 700, BY, 720, 230, 14).color(blower));
add("motor-fins", rodX(BX + 260, BX + 380, BY, 720, 250, 14).color('#2b2f33'));
add("belt-guard", blk(BX + 450, BY - 280, 140, 300, 120, 700).color(valve));
add("silencer", cylinder(1500, 260, 16).translate(BX - 600, BY - 100, 140).color('#9aa1a4'));
add("silencer-hood", sphere(320).scale([1, 1, 0.5]).translate(BX - 600, BY - 100, 1640).color('#9aa1a4'));
add("silencer-duct", rodX(BX - 600, BX - 200, BY - 100, 720, 150, 12).color('#9aa1a4'));
add("vfd-post", blk(BX + 1200, BY - 400, 0, 80, 80, 1700).color('#5d6366'));
add("vfd-panel", blk(BX + 1200, BY - 520, 900, 520, 200, 700).color('#d8dad6'));
add("vfd-display", blk(BX + 1120, BY - 625, 1350, 200, 10, 120).color('#1f3a2a'));
add("vfd-stripe", blk(BX + 1200, BY - 625, 1180, 520, 10, 50).color(blower));
add("vfd-knob", cylinder(30, 50, 10).rotateX(90).translate(BX + 1330, BY - 590, 1200).color(valve));

// Temperature probes in the pile and a solar logger on a stake.
const probes: [number, number][] = [[200, -1200], [1600, -1300], [3000, -1250]];
probes.forEach(([x, y], i) => {
  add(`probe-${i}`, cylinder(1500, 14, 6).rotateX(25).translate(x, y - 100, 1000).color('#c4c9cb'));
  add(`probe-handle-${i}`, rodX(x - 150, x + 150, y - 100 - 634, 2359, 22, 6).color(valve));
  add(`probe-cable-${i}`, box(20, 20, 900, true).rotateX(-40).translate(x, y - 1000, 2050).color('#2a2c2e'));
});
add("logger-stake", blk(PX0 + 300, -PW / 2 - 700, 0, 60, 60, 1500).color('#5d6366'));
add("logger-box", blk(PX0 + 300, -PW / 2 - 760, 1050, 300, 120, 360).color('#d8dad6'));
add("solar-panel", box(500, 350, 30, true).rotateX(-35).translate(PX0 + 300, -PW / 2 - 700, 1600).color('#1c2a4a'));

return p.model();
