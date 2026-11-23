// SPDX-License-Identifier: CC0-1.0
// Gas collection riser: the point on a capped landfill where buried gas
// laterals surface and join an above-ground header before the gas goes on to
// the flare. What makes it that station rather than a pipe stub: two black
// HDPE risers climbing out of bentonite-sealed soil mounds, each with a
// butterfly isolation valve and lever, tee-ing into a yellow-banded header on
// saddle supports, a brass sampling port per riser, and a condensate
// knockout pot on legs where the header ends, with its sight-glass level
// gauge, red-handled drain valve, nameplate and an outlet pipe that rises,
// crosses over and drops back into the ground toward the flare.
// Generic visualization geometry at about real size (4.6 m long, 2.4 m
// tall), millimetres, Z up, valves and gauge toward -Y.

meta({
  name: "gas-collection-riser",
  license: 'CC0-1.0',
  title: "Gas collection riser",
  description: "Landfill gas collection riser station at about real size: two black HDPE risers from sealed soil mounds with butterfly valves and sampling ports, tee-ing into a yellow-banded header on saddle supports, condensate knockout pot on legs with sight-glass gauge, drain valve and nameplate, and an outlet that crosses over and drops back underground toward the flare. Material controls: pipework, gas marking bands, knockout pot and supports. landfill, weathered and highVisibility presets.",
  tags: ["recycling", "landfill gas", "riser", "header", "condensate knockout", "butterfly valve", "HDPE pipe", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pipework = param('pipework', '#1f2123', { label: 'Pipework (HDPE)' });
const marking = param('marking', '#f0c419', { label: 'Gas marking bands' });
const vessel = param('vessel', '#4f6f5a', { label: 'Knockout pot (paint)' });
const supports = param('supports', '#a8b0b2', { label: 'Supports and pad (galvanised)' });

presets({
  landfill: { pipework: '#1f2123', marking: '#f0c419', vessel: '#4f6f5a', supports: '#a8b0b2' },
  weathered: { pipework: '#34322f', marking: '#b89a3a', vessel: '#5e6656', supports: '#8a8e88' },
  highVisibility: { pipework: '#1c1d1e', marking: '#f0c419', vessel: '#d77632', supports: '#c9ccce' },
});

const p = assembly("gas-collection-riser");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 12) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
const ring = (x: number, y: number, z: number, h: number, r: number, axis: 'x' | 'z') =>
  axis === 'z' ? cylinder(h, r, 14).translate(x, y, z - h / 2) : cylinder(h, r, 14).rotateY(90).translate(x - h / 2, y, z);

// Header along X, ending in the knockout pot.
const HZ = 900, PR = 110;
const KX = 1000, KR = 380, KZ0 = 450, KZ1 = 1700;
add("header", rod([-2050, 0, HZ], [KX - KR + 20, 0, HZ], PR).color(pipework));
add("header-end-cap", ring(-2070, 0, HZ, 50, PR + 18, 'x').color(pipework));
for (const [k, x] of [-1850, -1000, -50, 450].entries()) add(`header-band-${k}`, ring(x, 0, HZ, 120, PR + 4, 'x').color(marking));
for (const x of [-750, 200]) add(`header-flange-${x < 0 ? 'a' : 'b'}`, ring(x, 0, HZ, 40, PR + 30, 'x').color(pipework));
for (const [k, x] of [-1000, 0].entries()) {
  add(`saddle-post-${k}`, blk(x, 0, 150, 90, 90, HZ - PR - 150).color(supports));
  add(`saddle-${k}`, blk(x, 0, HZ - PR - 50, 160, 300, 50).color(supports));
  add(`saddle-strap-${k}`, ring(x, 0, HZ, 30, PR + 8, 'x').color(supports));
  add(`saddle-base-${k}`, blk(x, 0, 0, 400, 400, 150).color('#9a958a'));
}

// Two risers from sealed soil mounds, each with a butterfly valve.
for (const [k, x] of [-1500, -500].entries()) {
  add(`soil-mound-${k}`, sphere(500).scale([1.3, 1.3, 0.36]).translate(x, 0, 0).subtract(blk(x, 0, -300, 1500, 1500, 300)).color('#7d6a4c'));
  add(`bentonite-collar-${k}`, cylinder(200, 190, 14).translate(x, 0, 60).color('#8f8a82'));
  add(`riser-${k}`, rod([x, 0, 60], [x, 0, HZ], PR).color(pipework));
  add(`tee-${k}`, sphere(PR + 22).translate(x, 0, HZ).color(pipework));
  add(`riser-band-${k}`, ring(x, 0, 380, 100, PR + 4, 'z').color(marking));
  add(`valve-flange-lo-${k}`, ring(x, 0, 560, 30, PR + 35, 'z').color(pipework));
  add(`valve-body-${k}`, ring(x, 0, 610, 70, PR + 25, 'z').color('#3a5c8a'));
  add(`valve-flange-hi-${k}`, ring(x, 0, 660, 30, PR + 35, 'z').color(pipework));
  add(`valve-stem-${k}`, blk(x - 60, -PR - 60, 590, 40, 70, 40).color('#3a5c8a'));
  add(`valve-lever-${k}`, box(40, 320, 24, true).rotateZ(-30).translate(x - 140, -PR - 180, 642).color('#c8322a'));
  add(`sample-port-${k}`, cylinder(90, 18, 8).translate(x + 180, 0, HZ + PR - 10).color('#c9a24a'));
  add(`sample-cap-${k}`, cylinder(30, 26, 8).translate(x + 180, 0, HZ + PR + 80).color('#2f68b0'));
  add(`bollard-${k}`, cylinder(1000, 60, 10).translate(x - 420, -650, 0).color(marking));
  add(`bollard-band-${k}`, cylinder(90, 63, 10).translate(x - 420, -650, 760).color('#1c1d1e'));
}

// Condensate knockout pot on a concrete pad.
add("pad", blk(KX, 0, 0, 1300, 1300, 150).color('#9a958a'));
for (const [k, a] of [45, 135, 225, 315].entries()) {
  const lx = KX + 280 * Math.cos((a * Math.PI) / 180), ly = 280 * Math.sin((a * Math.PI) / 180);
  add(`pot-leg-${k}`, blk(lx, ly, 150, 70, 70, KZ0 - 100).color(supports));
  add(`pot-leg-foot-${k}`, blk(lx, ly, 150, 140, 140, 15).color(supports));
}
add("pot-shell", cylinder(KZ1 - KZ0, KR, 24).translate(KX, 0, KZ0).color(vessel));
add("pot-dome", sphere(KR).scale([1, 1, 0.45]).translate(KX, 0, KZ1).color(vessel));
add("pot-bottom", sphere(KR).scale([1, 1, 0.3]).translate(KX, 0, KZ0).color(vessel));
add("pot-band", cylinder(90, KR + 4, 24).translate(KX, 0, KZ1 - 260).color(marking));
add("nameplate", blk(KX - 120, -KR - 4, 1150, 240, 10, 150).color('#e8e6dc'));
add("nameplate-text", blk(KX - 120, -KR - 10, 1190, 180, 6, 22).color('#1c1d1e'));
// Sight-glass level gauge on the front.
for (const z of [650, 1400]) add(`gauge-stub-${z}`, rod([KX + 160, -KR + 30, z], [KX + 160, -KR - 90, z], 18, 8).color(supports));
add("gauge-glass", cylinder(800, 24, 8).translate(KX + 160, -KR - 90, 630).color('#7fb6c8'));
add("gauge-float", cylinder(60, 30, 8).translate(KX + 160, -KR - 90, 860).color('#c8322a'));
// Drain valve at the bottom.
add("drain-pipe", rod([KX - 200, -150, KZ0 - 40], [KX - 200, -560, KZ0 - 40], 26, 8).color(supports));
add("drain-valve", blk(KX - 200, -470, KZ0 - 80, 80, 80, 80).color('#c9a24a'));
add("drain-handle", blk(KX - 200, -470, KZ0, 160, 30, 20).color('#c8322a'));
add("drain-bucket", cylinder(220, 140, 12).translate(KX - 200, -560, 150).color('#2f68b0'));

// Outlet rising off the dome, crossing over and dropping underground.
const OX = 2300, OZ = 2300;
add("outlet-riser", rod([KX, 0, KZ1 + 120], [KX, 0, OZ], 90).color(pipework));
add("outlet-elbow-a", sphere(100).translate(KX, 0, OZ).color(pipework));
add("outlet-run", rod([KX, 0, OZ], [OX, 0, OZ], 90).color(pipework));
add("outlet-band", ring((KX + OX) / 2, 0, OZ, 120, 94, 'x').color(marking));
add("outlet-elbow-b", sphere(100).translate(OX, 0, OZ).color(pipework));
add("outlet-drop", rod([OX, 0, OZ], [OX, 0, 60], 90).color(pipework));
add("outlet-ground-sleeve", blk(OX, 0, 0, 360, 360, 60).color('#8f8a82'));
add("outlet-arrow", profileArrow().translate((KX + OX) / 2 - 150, -100, OZ).color(marking));
add("outlet-stay", blk(OX + 160, 0, 0, 60, 60, OZ - 100).color(supports));
add("outlet-stay-arm", blk(OX + 80, 0, OZ - 160, 220, 60, 60).color(supports));

function profileArrow() {
  return extrudePolygon([[0, -40], [200, -40], [200, -80], [300, 0], [200, 80], [200, 40], [0, 40]], 10).rotateX(90).translate(0, 5, 0);
}

return p.model();
