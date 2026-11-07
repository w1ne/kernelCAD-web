// SPDX-License-Identifier: CC0-1.0
// Widebody airliner: a long-haul twin-aisle jet. It reads as a widebody, not a
// stretched narrowbody, because of the fat lofted fuselage (about 1.3x the
// narrowbody's diameter), the long, deeply swept wing with strong dihedral,
// the big engines hung well forward on pylons, the very tall swept fin and the
// multi-wheel bogie main gear. The default is a quad-engine jumbo with the
// upper-deck hump; the twin option drops the hump and fits two very large
// turbofans and six-wheel bogies, like a modern long-haul twin.
// Stylized catalog geometry, millimetres, Z up, nose towards +X, tyres on z = 0.
meta({
  name: 'widebody-airliner',
  license: 'CC0-1.0',
  title: 'Widebody airliner',
  description: 'Twin-aisle long-haul airliner with a broad lofted fuselage and upswept tail cone, long swept wing with dihedral, pylon-mounted turbofans with open intakes, very tall swept fin, wraparound cockpit glass, cabin window band and cheatline, and bogie main gear. Shape choices: four or two engines; upper-deck hump or none. Material controls: airframe paint, livery paint, cockpit and cabin glass, bare aluminium and tyre rubber; weathered and high-visibility presets.',
  tags: ['airfield', 'aviation', 'airport', 'airliner', 'widebody', 'jumbo jet', 'long haul', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const engines = param('engines', 'quad', { choices: ['quad', 'twin'], label: 'Engines' });
const upperDeck = param('upperDeck', 'hump', { choices: ['hump', 'none'], label: 'Upper deck' });
const airframePaint = param('airframePaint', '#e9e8df', { label: 'Airframe paint' });
const liveryPaint = param('liveryPaint', '#b3262e', { label: 'Livery paint (fin, nacelles, cheatline)' });
const canopyGlass = param('canopyGlass', '#253844', { label: 'Cockpit and cabin glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare aluminium' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber and fan faces' });

presets({
  weathered: {
    airframePaint: '#b5b3a8',
    liveryPaint: '#6b3a3d',
    canopyGlass: '#2c3a40',
    bareMetal: '#6f7b7e',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#f4f3ee',
    liveryPaint: '#f0b52f',
    canopyGlass: '#1f3d4f',
    bareMetal: '#c0c9cb',
    rubber: '#262b2e',
  },
});

const p = assembly('widebody-airliner');
const add = (name, shape) => p.part(name, shape.scale(scale));
const paint = (name, shape) => add(name, shape.color(airframePaint));
const livery = (name, shape) => add(name, shape.color(liveryPaint));
const glass = (name, shape) => add(name, shape.color(canopyGlass));
const metal = (name, shape) => add(name, shape.color(bareMetal));
const dark = (name, shape) => add(name, shape.color(rubber));

// --- Loft helpers -----------------------------------------------------------
// A YZ section is a closed list of (y, z) points lofted along X between stations.
const sectionYZ = (pts) => {
  let o = path().moveTo(-pts[0][1], pts[0][0]);
  for (const [y, z] of pts.slice(1)) o = o.lineTo(-z, y);
  return o.close();
};
const loftX = (stations) => {
  const s = stations.slice().sort((a, b) => a[0] - b[0]);
  const profiles = s.map(([, pts]) => sectionYZ(pts));
  return profiles[0].loft(profiles.slice(1), {
    planes: s.map(([x]) => ({ plane: 'XY', origin: [0, 0, x] })),
    ruled: true,
  }).rotateY(90);
};
// An XZ section (chordwise airfoil) lofted along Y, for wings and tailplanes.
const loftY = (stations) => {
  const s = stations.slice().sort((a, b) => a[0] - b[0]);
  const profiles = s.map(([, pts]) => {
    let o = path().moveTo(pts[0][0], -pts[0][1]);
    for (const [x, z] of pts.slice(1)) o = o.lineTo(x, -z);
    return o.close();
  });
  return profiles[0].loft(profiles.slice(1), {
    planes: s.map(([y]) => ({ plane: 'XY', origin: [0, 0, y] })),
    ruled: true,
  }).rotateX(-90);
};
// An XY section lofted up Z, for fins and winglets.
const loftZ = (stations) => {
  const profiles = stations.map(([, pts]) => {
    let o = path().moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) o = o.lineTo(x, y);
    return o.close();
  });
  return profiles[0].loft(profiles.slice(1), {
    planes: stations.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
    ruled: true,
  });
};
const ring = (yc, zc, ry, rz, n = 16) =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [yc + ry * Math.cos(a), zc + rz * Math.sin(a)];
  });
// A thin band hugging an elliptical section between angles a0..a1 (degrees).
const arcBand = (zc, ry, rz, a0, a1, off = 1.2, t = 2, n = 8) => {
  const at = (deg, d) => {
    const a = (deg * Math.PI) / 180;
    return [(ry + d) * Math.cos(a), zc + (rz + d) * Math.sin(a)];
  };
  const steps = Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n);
  return [...steps.map((a) => at(a, off + t)), ...steps.slice().reverse().map((a) => at(a, off))];
};
// Symmetric airfoil-ish section: leading edge at xLe, chord c, thickness t.
const FOIL = [[0, 0], [-0.05, 0.42], [-0.22, 0.58], [-0.6, 0.4], [-1, 0.05], [-1, -0.05], [-0.6, -0.25], [-0.22, -0.36], [-0.05, -0.28]];
const foilXZ = (xLe, z, c, t) => FOIL.map(([u, v]) => [xLe + u * c, z + v * t]);
const foilXY = (xLe, y, c, t) => FOIL.map(([u, v]) => [xLe + u * c, y + v * t]);
// Round bar between two points.
const bar = (a, b, r) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const pitch = (Math.atan2(Math.hypot(d[0], d[1]), d[2]) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(len, r, 6).rotateY(pitch).rotateZ(yaw).translate(...a);
};
const tan = (deg) => Math.tan((deg * Math.PI) / 180);
// Row of a station table at distance d along it, linearly interpolated.
const tableAt = (table, d) => {
  const i = Math.max(table.findIndex((n) => n[0] >= d), 1);
  const [a, b] = [table[i - 1], table[i]];
  const f = (d - a[0]) / (b[0] - a[0]);
  return a.map((v, k) => v + (b[k] - v) * f);
};

// --- Fuselage ----------------------------------------------------------------
const D = 172; // fuselage diameter
const zc = 145; // fuselage centreline height
const L = 1900;
const nose = L / 2;
const tail = -L / 2;
const hump = upperDeck.value === 'hump';
// [distance from the end in D, centre offset in D, half-width in D, half-height in D]
const NOSE = [[0, -0.12, 0.05, 0.05], [0.15, -0.08, 0.3, 0.28], [0.45, -0.04, 0.43, 0.42], [0.9, -0.01, 0.49, 0.49], [1.5, 0, 0.5, 0.5]];
const TAIL = [[0, 0.3, 0.05, 0.07], [0.4, 0.26, 0.14, 0.16], [1.6, 0.16, 0.3, 0.33], [2.8, 0.05, 0.45, 0.45], [3.6, 0, 0.5, 0.5]];
// Upper-deck hump over the forward fuselage, blending back into the crown.
const HUMP = [[0.3, 0.04, 0.26, 0.3], [0.85, 0.22, 0.38, 0.44], [2.7, 0.25, 0.4, 0.45], [3.9, 0.06, 0.4, 0.43]];
const station = (x, [, dz, ry, rz]) => [x, ring(0, zc + dz * D, ry * D, rz * D)];
paint('fuselage', loftX([
  ...TAIL.map((s) => station(tail + s[0] * D, s)),
  ...NOSE.map((s) => station(nose - s[0] * D, s)),
]));
if (hump) paint('upper-deck', loftX(HUMP.map((s) => station(nose - s[0] * D, s))));
// Wraparound cockpit glass at the front of whichever deck carries the flight
// deck, then cabin window bands and a livery cheatline on both sides.
const cockpit = hump ? [HUMP, [0.55, 0.68, 0.8]] : [NOSE, [0.5, 0.62, 0.74]];
glass('cockpit-glass', loftX(cockpit[1].map((d) => {
  const s = tableAt(cockpit[0], d);
  return [nose - d * D, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 22, 158)];
})));
const barrel = [tail + 3.6 * D + 20, nose - 1.5 * D - 10];
for (const [tag, win, cheat] of [['starboard', [8, 13], [-11, -5]], ['port', [167, 172], [185, 191]]]) {
  glass('cabin-windows-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...win, 0.6, 1.4, 2)])));
  livery('cheatline-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...cheat, 0.6, 1.4, 2)])));
  if (hump) {
    const h = tableAt(HUMP, 1.8);
    const a = tag === 'port' ? [150, 156] : [24, 30];
    glass('upper-deck-windows-' + tag, loftX([1.1, 2.5].map((d) => [nose - d * D, arcBand(zc + h[1] * D, h[2] * D, h[3] * D, ...a, 0.8, 1.4, 2)])));
  }
}
metal('apu-exhaust', cylinder(12, 6, 8).rotateY(-90).translate(tail + 2, 0, zc + 0.3 * D));

// --- Wing ----------------------------------------------------------------------
const semi = 870;
const rootLe = nose - 0.42 * L;
const rootChord = 400;
const wingZ = zc - 0.3 * D;
const dihedral = 6;
const sweep = 37;
const kinkY = 0.33 * semi;
const wingAt = (y) => ({ le: rootLe - Math.abs(y) * tan(sweep), z: wingZ + Math.abs(y) * tan(dihedral) });
const wingStations = (side) => [
  [0, rootChord, 44],
  [kinkY, 230, 26],
  [semi, 80, 8],
].map(([y, c, t]) => [side * y, foilXZ(wingAt(y).le, wingAt(y).z, c, t)]);
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('wing-' + tag, loftY(wingStations(side)));
  metal('slat-' + tag, loftY([[side * 90, foilXZ(wingAt(90).le + 2, wingAt(90).z, 34, 24)], [side * (semi - 30), foilXZ(wingAt(semi - 30).le + 2, wingAt(semi - 30).z, 16, 8)]]));
}

// --- Engines -------------------------------------------------------------------
const quad = engines.value === 'quad';
const nacR = quad ? 38 : 56;
const nacLen = quad ? 175 : 215;
const nacelle = (tag, y) => {
  const w = wingAt(y);
  const front = w.le + 0.6 * nacLen;
  // Big fans sit high, their crown above the wing's lower surface ahead of it.
  const zn = w.z - (quad ? nacR + 12 : nacR * 0.72);
  const shell = loftX([
    [front, ring(y, zn, nacR * 0.9, nacR * 0.9, 14)],
    [front - 0.12 * nacLen, ring(y, zn, nacR, nacR, 14)],
    [front - 0.6 * nacLen, ring(y, zn, nacR * 0.94, nacR * 0.94, 14)],
    [front - nacLen, ring(y, zn, nacR * 0.6, nacR * 0.6, 14)],
  ]);
  const intake = cylinder(40, nacR * 0.74, 14).rotateY(90).translate(front - 34, y, zn);
  livery('nacelle-' + tag, shell.subtract(intake));
  dark('fan-face-' + tag, cylinder(4, nacR * 0.74, 14).rotateY(90).translate(front - 36, y, zn));
  metal('spinner-' + tag, loftX([[front - 34, ring(y, zn, nacR * 0.26, nacR * 0.26, 8)], [front - 16, ring(y, zn, 1, 1, 8)]]));
  metal('exhaust-cone-' + tag, loftX([[front - nacLen - 1, ring(y, zn, nacR * 0.42, nacR * 0.42, 10)], [front - nacLen - 36, ring(y, zn, 3, 3, 10)]]));
  const pylon = [[front - 0.2 * nacLen, zn + nacR - 4], [w.le - 90, w.z], [w.le - 160, w.z + 2], [front - 0.85 * nacLen, zn + nacR * 0.7]];
  paint('pylon-' + tag, loftY([[y - 6, pylon], [y + 6, pylon]]));
};
const engineYs = quad ? [['inner', 0.37], ['outer', 0.64]] : [['', 0.33]];
for (const [pos, f] of engineYs) {
  nacelle((pos ? pos + '-' : '') + 'starboard', f * semi);
  nacelle((pos ? pos + '-' : '') + 'port', -f * semi);
}

// --- Tail ---------------------------------------------------------------------
const finRootZ = zc + 0.3 * D;
const finTopZ = 540;
const finRootLe = tail + 2.1 * D;
livery('fin', loftZ([
  [finRootZ, foilXY(finRootLe, 0, 320, 20)],
  [finTopZ, foilXY(finRootLe - (finTopZ - finRootZ) * tan(42), 0, 110, 9)],
]));
const stabSemi = 310;
const stabLe = tail + 1.8 * D;
const stabZ = zc + 0.1 * D;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('tailplane-' + tag, loftY([
    [0, foilXZ(stabLe, stabZ, 190, 16)],
    [side * stabSemi, foilXZ(stabLe - stabSemi * tan(35), stabZ + stabSemi * tan(7), 60, 6)],
  ]));
}

// --- Landing gear ---------------------------------------------------------------
const tyre = (name, x, y, r, w, seg = 10) => dark(name, cylinder(w, r, seg).rotateX(90).translate(x, y + w / 2, r));
const noseX = nose - 0.11 * L;
metal('nose-gear-strut', bar([noseX, 0, 14], [noseX + 6, 0, zc - 0.45 * D], 5));
tyre('nose-wheel-port', noseX, -10, 14, 9, 12);
tyre('nose-wheel-starboard', noseX, 10, 14, 9, 12);
// A bogie: a beam with tyre pairs on two or three axles under one leg.
const bogie = (tag, x, y, axles, topZ) => {
  const r = 17;
  const pitch = 40;
  const xs = Array.from({ length: axles }, (_, i) => x + (i - (axles - 1) / 2) * pitch);
  metal('gear-leg-' + tag, bar([x, y, r], [x + 4, y, topZ], 6));
  metal('bogie-beam-' + tag, box(pitch * (axles - 1) + 16, 8, 8, true).translate(x, y, r));
  for (const [i, ax] of xs.entries()) {
    tyre('tyres-' + tag + '-' + (i + 1), ax, y, r, 26);
    metal('axle-hub-' + tag + '-' + (i + 1), cylinder(30, 6, 6).rotateX(90).translate(ax, y + 15, r));
  }
};
const mainX = rootLe - 0.55 * rootChord;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  if (quad) {
    bogie('wing-' + tag, mainX + 30, side * 150, 2, wingAt(150).z - 10);
    bogie('body-' + tag, mainX - 50, side * 52, 2, zc - 0.42 * D);
  } else {
    bogie(tag, mainX, side * 150, 3, wingAt(150).z - 10);
  }
}

return p.model();
