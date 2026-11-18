// SPDX-License-Identifier: CC0-1.0
// Narrowbody airliner: a single-aisle twinjet in the A320/737 class. It reads
// as an airliner because of the long round fuselage lofted from a drooped nose
// to an upswept tail cone with an APU tip, the low swept wing with dihedral and
// a kink, the two big-bypass engines hung forward of the wing on pylons, the
// tall swept fin and low tailplane, the wraparound cockpit glass and cabin
// window band, and the dual-wheel main gear under the wing roots.
// Stylized catalog geometry, millimetres, Z up, nose towards +X, tyres on z = 0.
meta({
  name: 'narrowbody-airliner',
  license: 'CC0-1.0',
  title: 'Narrowbody airliner',
  description: 'Single-aisle twinjet airliner with a lofted fuselage and upswept tail cone, low swept wing with dihedral, two pylon-mounted turbofans with open intakes, tall swept fin, wraparound cockpit glass, cabin window band and cheatline, and dual-wheel main gear. Shape choices: short, standard or stretched fuselage; sharklet or wingtip-fence tips. Material controls: airframe paint, livery paint, cockpit and cabin glass, bare aluminium and tyre rubber; weathered and high-visibility presets.',
  tags: ['airfield', 'aviation', 'airport', 'airliner', 'twinjet', 'single aisle', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const variant = param('variant', 'standard', { choices: ['short', 'standard', 'stretch'], label: 'Fuselage length' });
const wingtips = param('wingtips', 'sharklets', { choices: ['sharklets', 'fences'], label: 'Wingtip devices' });
const airframePaint = param('airframePaint', '#ecebe4', { label: 'Airframe paint' });
const liveryPaint = param('liveryPaint', '#1f4f8f', { label: 'Livery paint (fin, nacelles, cheatline)' });
const canopyGlass = param('canopyGlass', '#253844', { label: 'Cockpit and cabin glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare aluminium' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber and fan faces' });

presets({
  weathered: {
    airframePaint: '#b9b8ad',
    liveryPaint: '#45576a',
    canopyGlass: '#2c3a40',
    bareMetal: '#6f7b7e',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#f4f3ee',
    liveryPaint: '#e2541f',
    canopyGlass: '#1f3d4f',
    bareMetal: '#c0c9cb',
    rubber: '#262b2e',
  },
});

const p = assembly('narrowbody-airliner');
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
const D = 132; // fuselage diameter
const zc = 120; // fuselage centreline height
const L = { short: 1110, standard: 1250, stretch: 1470 }[variant.value];
const nose = L / 2;
const tail = -L / 2;
// [distance from the end in D, centre offset in D, half-width in D, half-height in D]
const NOSE = [[0, -0.12, 0.05, 0.05], [0.15, -0.08, 0.3, 0.28], [0.45, -0.04, 0.43, 0.42], [0.9, -0.01, 0.49, 0.49], [1.5, 0, 0.5, 0.5]];
const TAIL = [[0, 0.32, 0.05, 0.07], [0.4, 0.28, 0.14, 0.16], [1.6, 0.17, 0.3, 0.33], [2.8, 0.05, 0.45, 0.45], [3.6, 0, 0.5, 0.5]];
const station = (x, [, dz, ry, rz]) => [x, ring(0, zc + dz * D, ry * D, rz * D)];
paint('fuselage', loftX([
  ...TAIL.map((s) => station(tail + s[0] * D, s)),
  ...NOSE.map((s) => station(nose - s[0] * D, s)).reverse(),
]));
// Wraparound cockpit glass hugging the nose, then a cabin window band and a
// livery cheatline along the parallel barrel on both sides.
glass('cockpit-glass', loftX([0.5, 0.62, 0.74].map((d) => {
  const s = tableAt(NOSE, d);
  return [nose - d * D, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 22, 158)];
})));
const barrel = [tail + 3.6 * D + 20, nose - 1.5 * D - 10];
for (const [tag, win, cheat] of [['starboard', [8, 15], [-12, -5]], ['port', [165, 172], [185, 192]]]) {
  glass('cabin-windows-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...win, 0.6, 1.4, 2)])));
  livery('cheatline-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...cheat, 0.6, 1.4, 2)])));
}
metal('apu-exhaust', cylinder(10, 5, 8).rotateY(-90).translate(tail + 2, 0, zc + 0.32 * D));

// --- Wing ----------------------------------------------------------------------
const semi = 600;
const rootLe = nose - 0.4 * L;
const rootChord = 210;
const wingZ = zc - 0.3 * D;
const dihedral = 5;
const sweep = 27;
const kinkY = 0.34 * semi;
const kinkChord = 130;
const tipChord = 50;
const wingAt = (y) => ({ le: rootLe - Math.abs(y) * tan(sweep), z: wingZ + Math.abs(y) * tan(dihedral) });
const wingStations = (side) => [
  [0, rootChord, 24],
  [kinkY, kinkChord, 16],
  [semi, tipChord, 6],
].map(([y, c, t]) => [side * y, foilXZ(wingAt(y).le, wingAt(y).z, c, t)]);
const tipLe = wingAt(semi).le;
const tipZ = wingAt(semi).z;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('wing-' + tag, loftY(wingStations(side)));
  // Inboard leading-edge slat strip in bare metal.
  metal('slat-' + tag, loftY([[side * 70, foilXZ(wingAt(70).le + 2, wingAt(70).z, 22, 14)], [side * (semi - 20), foilXZ(wingAt(semi - 20).le + 2, wingAt(semi - 20).z, 12, 6)]]));
  if (wingtips.value === 'sharklets') {
    livery('sharklet-' + tag, loftZ([
      [tipZ, foilXY(tipLe - 2, side * (semi - 2), tipChord - 4, 4)],
      [tipZ + 80, foilXY(tipLe - 62, side * (semi + 4), 20, 2)],
    ]));
  } else {
    livery('wingtip-fence-' + tag, loftZ([
      [tipZ - 22, foilXY(tipLe - 18, side * semi, 30, 3)],
      [tipZ + 28, foilXY(tipLe - 24, side * semi, 30, 3)],
    ]));
  }
}

// --- Engines -------------------------------------------------------------------
const nacR = 34;
const nacLen = 150;
const nacelle = (tag, y) => {
  const w = wingAt(y);
  const front = w.le + 0.55 * nacLen;
  const zn = w.z - 6 - nacR - 4;
  const shell = loftX([
    [front, ring(y, zn, nacR * 0.9, nacR * 0.9, 14)],
    [front - 0.12 * nacLen, ring(y, zn, nacR, nacR, 14)],
    [front - 0.6 * nacLen, ring(y, zn, nacR * 0.94, nacR * 0.94, 14)],
    [front - nacLen, ring(y, zn, nacR * 0.6, nacR * 0.6, 14)],
  ]);
  const intake = cylinder(36, nacR * 0.74, 14).rotateY(90).translate(front - 30, y, zn);
  livery('nacelle-' + tag, shell.subtract(intake));
  dark('fan-face-' + tag, cylinder(4, nacR * 0.74, 14).rotateY(90).translate(front - 32, y, zn));
  metal('spinner-' + tag, loftX([[front - 30, ring(y, zn, 9, 9, 8)], [front - 16, ring(y, zn, 1, 1, 8)]]));
  metal('exhaust-cone-' + tag, loftX([[front - nacLen - 1, ring(y, zn, nacR * 0.42, nacR * 0.42, 10)], [front - nacLen - 30, ring(y, zn, 3, 3, 10)]]));
  paint('pylon-' + tag, loftY([
    [y - 5, [[front - 0.2 * nacLen, zn + nacR - 4], [w.le - 70, w.z], [w.le - 120, w.z + 2], [front - 0.85 * nacLen, zn + nacR * 0.7]]],
    [y + 5, [[front - 0.2 * nacLen, zn + nacR - 4], [w.le - 70, w.z], [w.le - 120, w.z + 2], [front - 0.85 * nacLen, zn + nacR * 0.7]]],
  ]));
};
nacelle('starboard', 0.33 * semi);
nacelle('port', -0.33 * semi);

// --- Tail ---------------------------------------------------------------------
const finRootZ = zc + 0.3 * D;
const finTopZ = 400;
const finRootLe = tail + 2.0 * D;
const finSweep = 36;
livery('fin', loftZ([
  [finRootZ, foilXY(finRootLe, 0, 210, 14)],
  [finTopZ, foilXY(finRootLe - (finTopZ - finRootZ) * tan(finSweep), 0, 80, 7)],
]));
const stabSemi = 210;
const stabLe = tail + 1.75 * D;
const stabZ = zc + 0.12 * D;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('tailplane-' + tag, loftY([
    [0, foilXZ(stabLe, stabZ, 120, 12)],
    [side * stabSemi, foilXZ(stabLe - stabSemi * tan(30), stabZ + stabSemi * tan(6), 44, 5)],
  ]));
}

// --- Landing gear ---------------------------------------------------------------
const wheel = (name, x, y, r, w) => {
  dark(name, cylinder(w, r, 12).rotateX(90).translate(x, y + w / 2, r));
  metal(name + '-hub', cylinder(w + 2, r * 0.45, 8).rotateX(90).translate(x, y + (w + 2) / 2, r));
};
const noseX = nose - 0.13 * L;
metal('nose-gear-strut', bar([noseX, 0, 12], [noseX + 6, 0, zc - 0.45 * D], 4));
wheel('nose-wheel-port', noseX, -8, 12.5, 8);
wheel('nose-wheel-starboard', noseX, 8, 12.5, 8);
const mainX = rootLe - 0.62 * rootChord;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  const y = side * 125;
  metal('main-gear-strut-' + tag, bar([mainX, y, 19], [mainX + 4, y, wingAt(125).z - 6], 5));
  wheel('main-wheel-inner-' + tag, mainX, y - 9, 19, 12);
  wheel('main-wheel-outer-' + tag, mainX, y + 9, 19, 12);
}

return p.model();
