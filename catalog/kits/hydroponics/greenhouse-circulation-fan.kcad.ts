// SPDX-License-Identifier: CC0-1.0
// Greenhouse circulation fan: the floor-stand horizontal-airflow (HAF) fan
// that keeps air moving through a crop so leaves dry, temperature evens out
// and CO2 reaches the canopy.
// What makes it a circulation fan: a short galvanised drum shroud with a
// concentric-ring wire guard front and back, five pitched blades on a hub,
// the motor can behind, all carried in a yoke with tilt knobs on a
// telescopic mast with a speed controller, standing on a four-leg base.
// Generic visualization geometry at about real size (500-750 mm blade
// diameter, head about 1.2 m up), millimetres, Z up, airflow toward -Y.

meta({
  name: "greenhouse-circulation-fan",
  license: 'CC0-1.0',
  title: "Greenhouse circulation fan",
  description: "Floor-stand greenhouse circulation (HAF) fan at about real size: galvanised drum shroud with concentric-ring wire guards front and back, five pitched blades on a hub, rear motor can, yoke with tilt knobs, telescopic mast with clamp and speed controller, and a four-leg base on rubber feet. Material controls: shroud, guard, blades, stand, plus blade diameter (500/630/750 mm) and tilt choices. galvanised, blackGuard, whiteHousing and weathered presets.",
  tags: ['fan', 'circulation fan', 'haf fan', 'air circulation', 'pedestal fan', 'ventilation', 'climate', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shroud = param('shroud', '#b9c0c2', { label: 'Shroud (galvanised steel)' });
const guard = param('guard', '#3a3f44', { label: 'Guard (powder-coated wire)' });
const blades = param('blades', '#2f6fa8', { label: 'Blades (polypropylene)' });
const stand = param('stand', '#5d6b75', { label: 'Stand (powder-coated steel)' });
const diameter = param('diameter', '630', { choices: ['500', '630', '750'], label: 'Blade diameter (mm)' });
const tilt = param('tilt', 'up 15°', { choices: ['level', 'up 15°'], label: 'Head tilt' });

presets({
  galvanised: { shroud: '#b9c0c2', guard: '#3a3f44', blades: '#2f6fa8', stand: '#5d6b75' },
  blackGuard: { shroud: '#2a2d30', guard: '#14161a', blades: '#c9ced1', stand: '#3c4246' },
  whiteHousing: { shroud: '#eceeea', guard: '#9aa0a4', blades: '#e0a21c', stand: '#d9dcde' },
  weathered: { shroud: '#9c9f96', guard: '#4e4a42', blades: '#5f7f96', stand: '#6d6a5e' },
});

const p = assembly("greenhouse-circulation-fan");
const YAW = 22; // turn the head a little so the drum depth shows
const add = (name: string, shape: Shape) => p.part(name, shape.rotateZ(YAW).scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const t = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(t).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const R = Number(diameter.value) / 2; // blade tip radius
const RS = R + 25; // shroud radius
const DEPTH = Math.round(R * 0.5); // shroud depth (Y)
const HZ = 1200; // head centre height
const TILT = tilt.value === 'level' ? 0 : 15;
// Head parts are built around the head centre, front on -Y, then tilted
// about the pivot axis (negative rotateX tips the front up).
const head = (s: Shape) => s.rotateX(-TILT).translate(0, 0, HZ);
const ring = (y: number, r: number, w = 6) => cylY(0, y + w / 2, 0, w, r, 32).subtract(cylY(0, y + w, 0, w * 2, r - w, 32));

// Drum shroud with rolled lips.
add("shroud-drum", head(cylY(0, DEPTH / 2, 0, DEPTH, RS, 32).subtract(cylY(0, DEPTH / 2 + 10, 0, DEPTH + 20, RS - 8, 32))).color(shroud));
for (const [tag, y] of [['front', -DEPTH / 2], ['rear', DEPTH / 2]] as [string, number][]) {
  add(`shroud-lip-${tag}`, head(ring(y, RS + 14, 22)).color(shroud));
}

// Front guard: concentric rings, radial spokes, centre badge.
const FY = -DEPTH / 2 - 14;
for (const [i, f] of [1, 0.76, 0.52, 0.3].entries()) add(`guard-ring-${i}`, head(ring(FY, (RS + 4) * f)).color(guard));
for (let k = 0; k < 12; k++) {
  add(`guard-spoke-${k}`, head(box(6, 6, RS, true).translate(0, FY - 3, RS / 2).rotateY(k * 30)).color(guard));
}
add("guard-badge", head(cylY(0, FY + 2, 0, 8, R * 0.16, 16)).color(shroud));
add("guard-badge-mark", head(box(R * 0.2, 3, 14, true).translate(0, FY - 7, 0)).color(blades));

// Rear guard: two rings and six spokes around the motor.
const BY = DEPTH / 2 + 14;
for (const [i, f] of [1, 0.6].entries()) add(`rear-ring-${i}`, head(ring(BY, (RS + 4) * f)).color(guard));
for (let k = 0; k < 6; k++) {
  add(`rear-spoke-${k}`, head(box(6, 6, RS, true).translate(0, BY + 3, RS / 2).rotateY(k * 60 + 30)).color(guard));
}

// Five pitched blades on a hub.
const s = R / 315;
const paddle = extrudePolygon([[-45 * s, 55 * s], [45 * s, 55 * s], [110 * s, 230 * s], [95 * s, 298 * s], [-30 * s, 308 * s], [-90 * s, 250 * s]], 6).rotateX(90);
for (let k = 0; k < 5; k++) add(`blade-${k}`, head(paddle.rotateZ(26).rotateY(k * 72 + 10).translate(0, -10, 0)).color(blades));
add("hub", head(cylY(0, 30, 0, 80, R * 0.17, 16)).color(blades));
add("hub-cap", head(cylY(0, -45, 0, 12, R * 0.1, 12)).color('#8c9296'));

// Motor can behind the blades, with a terminal lump and cable.
const ML = Math.round(R * 0.55);
add("motor", head(cylY(0, BY + ML, 0, ML + 20, R * 0.3, 20)).color('#2a2d30'));
add("motor-cap", head(cylY(0, BY + ML + 14, 0, 14, R * 0.26, 16)).color('#5a6066'));
for (let k = 0; k < 6; k++) add(`motor-rib-${k}`, head(box(10, ML - 30, 8, true).translate(0, BY + ML / 2, R * 0.3).rotateY(k * 60)).color('#3a3f44'));
add("motor-terminal", head(blk(0, BY + ML / 2, R * 0.28, 70, 80, 50)).color('#2a2d30'));

// Yoke with tilt knobs (yawed with the head, not tilted).
const YX = RS + 45;
const ZY = HZ - RS - 70; // yoke bottom bar
for (const sx of [-1, 1]) {
  add(`yoke-arm-${sx > 0 ? 'r' : 'l'}`, blk(sx * YX, 0, ZY, 30, 50, HZ - ZY + 30).color(stand));
  add(`tilt-knob-${sx > 0 ? 'r' : 'l'}`, cylX(sx > 0 ? YX + 15 : -YX - 55, 0, HZ, 40, 32, 10).color('#1b1b1b'));
  add(`pivot-stud-${sx > 0 ? 'r' : 'l'}`, cylX(sx > 0 ? RS : -YX - 15, 0, HZ, YX - RS + 15, 10, 8).color('#8c9296'));
}
add("yoke-bar", blk(0, 0, ZY - 30, 2 * YX + 30, 50, 30).color(stand));

// Telescopic mast with clamp knob and speed controller.
add("mast-inner", cylZ(0, 0, 680, ZY - 30 - 680, 20, 12).color('#c9ced1'));
add("mast-sleeve", cylZ(0, 0, 90, 640, 30, 12).color(stand));
add("mast-clamp", cylZ(0, 0, 700, 40, 38, 12).color(stand));
add("clamp-knob", cylY(0, -38, 720, 40, 16, 8).color('#1b1b1b'));
add("controller", blk(0, -48, 470, 110, 50, 150).color('#e9ebe7'));
add("controller-dial", cylY(0, -73, 560, 16, 30, 14).color('#c0392b'));
add("controller-scale", blk(0, -75, 500, 70, 3, 10).color('#2a2d30'));
const cable: [number, number, number][] = [[0, -60, 470], [40, -140, 300], [120, -260, 60], [360, -300, 12]];
for (let k = 0; k < cable.length - 1; k++) add(`cable-${k}`, rod(cable[k], cable[k + 1], 5, 6).color('#1b1b1b'));

// Four-leg base on rubber feet.
add("base-hub", cylZ(0, 0, 50, 70, 60, 14).color(stand));
for (let k = 0; k < 4; k++) {
  add(`leg-${k}`, box(470, 50, 36, true).translate(270, 0, 68).rotateZ(45 + k * 90).color(stand));
  add(`foot-${k}`, cylZ(480, 0, 0, 50, 34, 10).rotateZ(45 + k * 90).color('#1b1b1b'));
}

return p.model();
