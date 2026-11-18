// SPDX-License-Identifier: CC0-1.0
// Orchestra shell panel: one freestanding tower of a concert acoustic shell,
// the kind rolled on stage to wrap an orchestra and throw its sound forward.
// What makes it a shell tower rather than a wall: a convex, curved timber
// reflector face (curved so it scatters sound rather than echoing it) laid
// up in alternating veneer staves, a forward-tilted canopy reflector on top,
// a steel space-frame behind with diagonal bracing, and a low rolling base
// with swivel casters and rear outrigger legs with levelling pads.
// Generic visualization geometry at about real size (1.5 m wide, 3.1 m
// tall), millimetres, Z up, reflector face toward -Y, standing on z = 0.

meta({
  name: "orchestra-shell-panel",
  license: 'CC0-1.0',
  title: "Orchestra shell panel",
  description: "Concert acoustic shell tower at about real size: convex curved timber reflector face in alternating veneer staves with a trim edge, forward-tilted curved canopy reflector, steel space-frame behind with diagonal bracing, rolling base with four swivel casters and rear outrigger legs with levelling pads. Material controls: face veneer, inlay staves and trim, steel frame, casters and pads. maple, walnut and whiteHall presets.",
  tags: ['orchestra shell', 'acoustic shell', 'shell tower', 'acoustic reflector', 'concert stage', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const veneer = param('veneer', '#e8bd80', { label: 'Face veneer' });
const inlay = param('inlay', '#c48d52', { label: 'Inlay staves and trim' });
const frame = param('frame', '#2e3236', { label: 'Steel frame' });
const rubber = param('rubber', '#18191b', { label: 'Casters and pads' });

presets({
  maple: { veneer: '#e8bd80', inlay: '#c48d52', frame: '#2e3236', rubber: '#18191b' },
  walnut: { veneer: '#7a5235', inlay: '#5a3a24', frame: '#1f2124', rubber: '#141516' },
  whiteHall: { veneer: '#ece8df', inlay: '#c9b48a', frame: '#7d868b', rubber: '#2a2c2e' },
});

const p = assembly("orchestra-shell-panel");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

// Convex reflector: circular arc of radius R centred behind the face at
// y = R - 40, so the face bulges 40 mm toward -Y at the middle.
const R = 2600;
const T = 40;
const HALF = 760;
const AMAX = Math.asin(HALF / R);
const CY = R - 40;
// Closed (x, y) outline of an arc stave between angles a0..a1, thickness T.
const stave = (a0: number, a1: number, r: number = R, t: number = T) => {
  const n = 3;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([r * Math.sin(a), CY - r * Math.cos(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([(r - t) * Math.sin(a), CY - (r - t) * Math.cos(a)]);
  }
  return pts;
};

const Z0 = 260; // face bottom
const FH = 2300; // face height
const NS = 7;
for (let k = 0; k < NS; k++) {
  const a0 = -AMAX + (2 * AMAX * k) / NS;
  const a1 = -AMAX + (2 * AMAX * (k + 1)) / NS;
  add(`stave-${k}`, extrudePolygon(stave(a0, a1), FH).translate(0, 0, Z0).color(k % 2 ? inlay : veneer));
}
// Trim edges: thin proud bands at the bottom and top of the face.
add("trim-bottom", extrudePolygon(stave(-AMAX, AMAX, R + 12, T + 24), 60).translate(0, 0, Z0).color(inlay));
add("trim-top", extrudePolygon(stave(-AMAX, AMAX, R + 12, T + 24), 60).translate(0, 0, Z0 + FH - 60).color(inlay));

// Canopy reflector tilted 30 degrees forward over the players.
const CH = 900;
const yEdge = CY - R * Math.cos(AMAX);
add("canopy", extrudePolygon(stave(-AMAX, AMAX), CH).translate(0, -yEdge, 0).rotateX(30).translate(0, yEdge + 30, Z0 + FH - 20).color(veneer));
add("canopy-trim", extrudePolygon(stave(-AMAX, AMAX, R + 12, T + 24), 60).translate(0, -yEdge, CH - 60).rotateX(30).translate(0, yEdge + 30, Z0 + FH - 20).color(inlay));

// Steel space-frame behind the face.
const YB = 320; // rear chords
for (const x of [-560, 560]) {
  const tag = x < 0 ? 'l' : 'r';
  add(`chord-front-${tag}`, blk(x, 140, Z0, 50, 50, FH).color(frame));
  add(`chord-rear-${tag}`, blk(x, YB, Z0, 50, 50, FH - 200).color(frame));
  for (const z of [Z0 + 100, Z0 + 1100, Z0 + 2050]) add(`strut-${tag}-${z}`, blk(x, (140 + YB) / 2, z, 40, YB - 140, 40).color(frame));
  // Diagonals in the side truss.
  for (const [z0, z1] of [[Z0 + 140, Z0 + 1100], [Z0 + 1140, Z0 + 2050]]) {
    const dy = YB - 140;
    const dz = z1 - z0;
    const L = Math.sqrt(dy * dy + dz * dz);
    add(`diag-${tag}-${z0}`, cylinder(L, 14, 8).rotateX((-Math.atan2(dy, dz) * 180) / Math.PI).translate(x, 140, z0).color(frame));
  }
}
for (const z of [Z0 + 600, Z0 + 1600]) add(`cross-rail-${z}`, blk(0, YB, z, 1120, 40, 40).color(frame));
add("canopy-arm-l", blk(-560, 200, Z0 + FH, 40, 160, 40).color(frame));
add("canopy-arm-r", blk(560, 200, Z0 + FH, 40, 160, 40).color(frame));

// Rolling base with casters and rear outrigger legs.
add("base-front", blk(0, 120, 150, 1300, 80, 80).color(frame));
add("base-rear", blk(0, YB, 150, 1300, 80, 80).color(frame));
for (const x of [-600, 600]) {
  const tag = x < 0 ? 'l' : 'r';
  add(`base-side-${tag}`, blk(x, (120 + YB) / 2, 150, 80, YB - 120 + 80, 80).color(frame));
  add(`kick-${tag}`, blk(x, 120, 230, 60, 60, Z0 - 230).color(frame));
  for (const y of [120, YB]) {
    add(`caster-plate-${tag}-${y}`, blk(x, y, 138, 100, 90, 12).color(frame));
    add(`caster-fork-${tag}-${y}`, blk(x + 18, y, 60, 60, 50, 78).color(frame));
    add(`caster-wheel-${tag}-${y}`, cylinder(36, 60, 14).rotateX(90).translate(x + 18, y + 18, 57).subtract(box(160, 160, 20, true).translate(x + 18, y, -10)).color(rubber));
  }
  // Outrigger leg running back to a levelling pad.
  add(`outrigger-${tag}`, blk(x, YB + 330, 170, 60, 620, 50).color(frame));
  add(`leveller-${tag}`, cylinder(150, 12, 8).translate(x, YB + 600, 30).color(frame));
  add(`pad-${tag}`, cylinder(30, 45, 12).translate(x, YB + 600, 0).color(rubber));
}

return p.model();
