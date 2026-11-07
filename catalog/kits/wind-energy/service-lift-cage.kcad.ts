// SPDX-License-Identifier: CC0-1.0
// Turbine service lift cage: the person-sized mesh cage that climbs inside a
// wind turbine tower. A traction hoist on the roof winds up the wire rope, a
// separate safety rope runs through an arrest device, and the cage is steered by
// guide wires or by trolleys on the tower ladder. A sliding mesh door, yellow
// obstruction plate under the floor and inside control box complete it. Ropes
// leaving the roof and the guide system are what make it a lift, not a crate.
// Stylized catalog geometry, millimetres, Z up, door on the -Y face.
meta({
  name: "service-lift-cage",
  license: 'CC0-1.0',
  title: "Turbine service lift cage",
  description: "Two-person tower service lift with a mesh cage, sliding mesh door on a top track, roof-mounted traction hoist with wire and safety ropes, arrest device, control box and yellow obstruction plate. Shape choices: guide wires or ladder-guided trolleys, door closed or open. Material controls: galvanized steel, safety paint, drive unit and wire rope; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'service lift', 'tower', 'elevator', 'hoist', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const guidance = param('guidance', 'wires', { choices: ['wires', 'ladder'], label: 'Guide system' });
const door = param('door', 'closed', { choices: ['closed', 'open'], label: 'Door' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });
const driveUnit = param('driveUnit', '#2f3a40', { label: 'Drive unit' });
const wireRope = param('wireRope', '#5b6366', { label: 'Wire rope' });

presets({
  weathered: { galvanizedSteel: '#6c7a7b', safetyPaint: '#c99a3a', driveUnit: '#3c4246', wireRope: '#6e5e4e' },
  highVisibility: { galvanizedSteel: '#a9b6b8', safetyPaint: '#f7c331', driveUnit: '#d6402c', wireRope: '#3e4547' },
});

const p = assembly("service-lift-cage");
const add = (name, shape) => p.part(name, shape.scale(scale));
const steel = (name, shape) => add(name, shape.color(galvanizedSteel));
const painted = (name, shape) => add(name, shape.color(safetyPaint));
const drive = (name, shape) => add(name, shape.color(driveUnit));
const rope = (name, shape) => add(name, shape.color(wireRope));
const bar = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// (radius, z) outline revolved about the vertical axis.
const ring = (pts) => {
  let outline = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) outline = outline.lineTo(r, z);
  return outline.close().revolve();
};

const W = 780;
const D = 660;
const floorZ = 110;
const roofZ = 2150;
const H = roofZ - floorZ;

// Base: yellow obstruction plate stops the lift if it lands on anything.
painted('obstruction-plate', bar(0, 0, 0, W - 40, D - 40, 24));
steel('base-frame', bar(0, 0, 24, W, D, floorZ - 24));
for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  steel('corner-post' + (x < 0 ? '-left' : '-right') + (y < 0 ? '-front' : '-rear'), bar(x * (W / 2 - 25), y * (D / 2 - 25), floorZ, 50, 50, H));
}
for (const z of [floorZ + 1000, roofZ - 50]) {
  const id = z < 2000 ? '-mid' : '-top';
  steel('rail-rear' + id, bar(0, D / 2 - 25, z, W, 40, 50));
  steel('rail-left' + id, bar(-(W / 2 - 25), 0, z, 40, D, 50));
  steel('rail-right' + id, bar(W / 2 - 25, 0, z, 40, D, 50));
}
steel('rail-front-top', bar(0, -(D / 2 - 25), roofZ - 50, W, 40, 50));

// Mesh walls: welded wire grid on the back and both sides.
const mesh = (name, along, span, at) => {
  const n = Math.floor(span / 95);
  for (let i = 1; i < n; i += 1) {
    const t = -span / 2 + (i * span) / n;
    add(name + '-wire-v' + i, along === 'x' ? bar(t, at, floorZ, 10, 10, H) : bar(at, t, floorZ, 10, 10, H));
  }
  for (let k = 1; k < 7; k += 1) {
    const z = floorZ + (k * H) / 7;
    add(name + '-wire-h' + k, along === 'x' ? bar(0, at, z, span, 10, 10) : bar(at, 0, z, 10, span, 10));
  }
};
mesh('rear-mesh', 'x', W - 50, D / 2 - 25);
mesh('left-mesh', 'y', D - 50, -(W / 2 - 25));
mesh('right-mesh', 'y', D - 50, W / 2 - 25);

// Sliding door on an outside top track; it rolls past the right-hand side.
const doorX = door.value === 'open' ? W - 120 : 0;
const dy = -(D / 2 + 30);
const doorW = W - 100;
const doorH = H - 120;
const trackEnd = Math.max(W / 2, doorX + doorW / 2) + 30;
steel('door-track', bar((trackEnd - W / 2) / 2, dy - 10, roofZ - 40, trackEnd + W / 2, 30, 60));
painted('door-stile-left', bar(doorX - doorW / 2 + 25, dy, floorZ + 20, 50, 30, doorH));
painted('door-stile-right', bar(doorX + doorW / 2 - 25, dy, floorZ + 20, 50, 30, doorH));
painted('door-rail-bottom', bar(doorX, dy, floorZ + 20, doorW, 30, 60));
painted('door-rail-mid', bar(doorX, dy, floorZ + 1000, doorW, 30, 50));
painted('door-rail-top', bar(doorX, dy, floorZ + doorH - 40, doorW, 30, 60));
for (let i = 1; i < 7; i += 1) steel('door-wire-v' + i, bar(doorX - doorW / 2 + (i * doorW) / 7, dy, floorZ + 20, 10, 10, doorH));
drive('door-handle', bar(doorX - doorW / 2 + 70, dy - 30, floorZ + 950, 30, 40, 200));

// Roof: plate, escape hatch and the traction hoist with its ropes.
steel('roof-plate', bar(0, 0, roofZ, W, D, 30));
painted('roof-hatch', bar(180, -120, roofZ + 30, 340, 300, 40));
const hz = roofZ + 30;
drive('hoist-gearbox', bar(-60, 120, hz, 240, 220, 300));
drive('hoist-motor', cylinder(200, 105, 12).rotateY(-90).translate(-180, 120, hz + 170));
steel('motor-fan-cover', cylinder(50, 95, 12).rotateY(-90).translate(-380, 120, hz + 170));
steel('traction-sheave', ring([[40, 0], [120, 0], [100, 30], [120, 60], [40, 60]]).rotateY(90).translate(60, 120, hz + 170));
painted('arrest-device', bar(260, 160, hz, 140, 160, 220));
rope('hoist-wire-rope', cylinder(1500, 8, 6).translate(90, 120, hz + 280));
rope('safety-wire-rope', cylinder(1500, 8, 6).translate(260, 160, hz + 220));
drive('control-box', bar(-(W / 2 - 110), -80, floorZ + 900, 120, 220, 300));

const top = roofZ + 1700;
if (guidance.value === 'ladder') {
  // Ladder-guided: trolleys on the back roll up the tower ladder stiles.
  const ly = D / 2 + 170;
  for (const x of [-220, 220]) {
    const s = x < 0 ? '-left' : '-right';
    steel('ladder-stile' + s, bar(x, ly, 0, 60, 30, top));
    for (const z of [floorZ + 150, roofZ - 300]) {
      const at = z < 1000 ? '-low' : '-high';
      drive('guide-trolley' + s + at, bar(x, D / 2 + 70, z, 120, 140, 160));
      steel('trolley-roller' + s + at, cylinder(80, 32, 8).rotateY(90).translate(x - 40, ly - 40, z + 80));
    }
  }
  for (let z = 280; z < top; z += 280) steel('ladder-rung-' + Math.round(z / 280), cylinder(440, 14, 6).rotateY(90).translate(-220, ly, z));
} else {
  // Wire-guided: a taut wire each side threads through roller brackets.
  for (const side of [-1, 1]) {
    const s = side < 0 ? '-left' : '-right';
    const x = side * (W / 2 + 60);
    rope('guide-wire' + s, cylinder(top, 8, 6).translate(x, 0, 0));
    for (const z of [floorZ + 120, roofZ - 220]) {
      const at = z < 1000 ? '-low' : '-high';
      drive('guide-bracket' + s + at, bar(side * (W / 2 + 30), 0, z, 70, 120, 100));
      steel('guide-roller' + s + at, ring([[0, 0], [30, 0], [30, 50], [0, 50]]).rotateX(90).translate(x, 25, z + 50 + 30));
    }
  }
}

return p.model();
