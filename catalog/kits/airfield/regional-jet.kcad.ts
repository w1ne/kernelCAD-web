// SPDX-License-Identifier: CC0-1.0
// Regional jet: a 70-100 seat short-haul twinjet. It reads as a regional jet
// rather than a mainline airliner because of the slimmer lofted fuselage
// (about three-quarters of the narrowbody's diameter), the short gear that
// keeps it low to the apron, the small wing with blended winglets, and the
// small high-bypass engines. The engines either hang under the wing on pylons
// with a low tailplane, or sit on the aft fuselage with a T-tail, the two
// layouts regional jets are built in.
// Stylized catalog geometry, millimetres, Z up, nose towards +X, tyres on z = 0.
meta({
  name: 'regional-jet',
  license: 'CC0-1.0',
  title: 'Regional jet',
  description: 'Short-haul regional twinjet with a slim lofted fuselage and upswept tail cone, swept wing with blended winglets, small turbofans with open intakes, wraparound cockpit glass, cabin window band and cheatline, and short dual-wheel gear. Shape choices: under-wing engines with a low tailplane or rear-fuselage engines with a T-tail; winglets or plain tips. Material controls: airframe paint, livery paint, cockpit and cabin glass, bare aluminium and tyre rubber; weathered and high-visibility presets.',
  tags: ['airfield', 'aviation', 'airport', 'airliner', 'regional jet', 'twinjet', 'short haul', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const engineMount = param('engineMount', 'underwing', { choices: ['underwing', 'rear'], label: 'Engine layout' });
const wingtips = param('wingtips', 'winglets', { choices: ['winglets', 'plain'], label: 'Wingtips' });
const airframePaint = param('airframePaint', '#e9e8df', { label: 'Airframe paint' });
const liveryPaint = param('liveryPaint', '#2a7a5a', { label: 'Livery paint (fin, nacelles, cheatline)' });
const canopyGlass = param('canopyGlass', '#253844', { label: 'Cockpit and cabin glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare aluminium' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber and fan faces' });

presets({
  weathered: {
    airframePaint: '#b7b6ab',
    liveryPaint: '#43594f',
    canopyGlass: '#2c3a40',
    bareMetal: '#6f7b7e',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#f4f3ee',
    liveryPaint: '#7a2fb0',
    canopyGlass: '#1f3d4f',
    bareMetal: '#c0c9cb',
    rubber: '#262b2e',
  },
});

const p = assembly('regional-jet');
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
const D = 102; // fuselage diameter
const zc = 92; // fuselage centreline height
const L = 1080;
const nose = L / 2;
const tail = -L / 2;
const rear = engineMount.value === 'rear';
// [distance from the end in D, centre offset in D, half-width in D, half-height in D]
const NOSE = [[0, -0.12, 0.05, 0.05], [0.15, -0.08, 0.3, 0.28], [0.45, -0.04, 0.43, 0.42], [0.9, -0.01, 0.49, 0.49], [1.5, 0, 0.5, 0.5]];
const TAIL = [[0, 0.3, 0.05, 0.07], [0.4, 0.26, 0.14, 0.16], [1.6, 0.16, 0.3, 0.33], [2.8, 0.05, 0.45, 0.45], [3.6, 0, 0.5, 0.5]];
const station = (x, [, dz, ry, rz]) => [x, ring(0, zc + dz * D, ry * D, rz * D)];
paint('fuselage', loftX([
  ...TAIL.map((s) => station(tail + s[0] * D, s)),
  ...NOSE.map((s) => station(nose - s[0] * D, s)),
]));
// Wraparound cockpit glass hugging the nose, then a cabin window band and a
// livery cheatline along the parallel barrel on both sides.
glass('cockpit-glass', loftX([0.5, 0.62, 0.74].map((d) => {
  const s = tableAt(NOSE, d);
  return [nose - d * D, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 22, 158)];
})));
const barrel = [tail + 3.6 * D + 20, nose - 1.5 * D - 10];
for (const [tag, win, cheat] of [['starboard', [8, 16], [-13, -5]], ['port', [164, 172], [185, 193]]]) {
  glass('cabin-windows-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...win, 0.6, 1.4, 2)])));
  livery('cheatline-' + tag, loftX(barrel.map((x) => [x, arcBand(zc, D / 2, D / 2, ...cheat, 0.6, 1.4, 2)])));
}
metal('apu-exhaust', cylinder(8, 4, 8).rotateY(-90).translate(tail + 2, 0, zc + 0.3 * D));

// --- Wing ----------------------------------------------------------------------
const semi = 440;
const rootLe = nose - (rear ? 0.47 : 0.42) * L;
const rootChord = 160;
const wingZ = zc - 0.3 * D;
const dihedral = 5;
const sweep = 26;
const tipChord = 40;
const wingAt = (y) => ({ le: rootLe - Math.abs(y) * tan(sweep), z: wingZ + Math.abs(y) * tan(dihedral) });
const wingStations = (side) => [
  [0, rootChord, 20],
  [0.35 * semi, 100, 13],
  [semi, tipChord, 5],
].map(([y, c, t]) => [side * y, foilXZ(wingAt(y).le, wingAt(y).z, c, t)]);
const tipLe = wingAt(semi).le;
const tipZ = wingAt(semi).z;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('wing-' + tag, loftY(wingStations(side)));
  metal('slat-' + tag, loftY([[side * 60, foilXZ(wingAt(60).le + 2, wingAt(60).z, 18, 11)], [side * (semi - 16), foilXZ(wingAt(semi - 16).le + 2, wingAt(semi - 16).z, 10, 5)]]));
  if (wingtips.value === 'winglets') {
    // Blended winglet: an inclined panel rising and sweeping back off the tip.
    livery('winglet-' + tag, loftZ([
      [tipZ, foilXY(tipLe - 2, side * (semi - 2), tipChord - 4, 3)],
      [tipZ + 62, foilXY(tipLe - 44, side * (semi + 10), 18, 2)],
    ]));
  }
}

// --- Engines -------------------------------------------------------------------
const nacR = 27;
const nacLen = 115;
// Nacelle with an open intake, dark fan face, spinner and exhaust cone.
const nacelle = (tag, y, zn, front) => {
  const shell = loftX([
    [front, ring(y, zn, nacR * 0.9, nacR * 0.9, 14)],
    [front - 0.12 * nacLen, ring(y, zn, nacR, nacR, 14)],
    [front - 0.6 * nacLen, ring(y, zn, nacR * 0.94, nacR * 0.94, 14)],
    [front - nacLen, ring(y, zn, nacR * 0.6, nacR * 0.6, 14)],
  ]);
  const intake = cylinder(30, nacR * 0.74, 14).rotateY(90).translate(front - 25, y, zn);
  livery('nacelle-' + tag, shell.subtract(intake));
  dark('fan-face-' + tag, cylinder(4, nacR * 0.74, 14).rotateY(90).translate(front - 27, y, zn));
  metal('spinner-' + tag, loftX([[front - 25, ring(y, zn, 7, 7, 8)], [front - 13, ring(y, zn, 1, 1, 8)]]));
  metal('exhaust-cone-' + tag, loftX([[front - nacLen - 1, ring(y, zn, nacR * 0.42, nacR * 0.42, 10)], [front - nacLen - 22, ring(y, zn, 2, 2, 10)]]));
};
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  if (rear) {
    // Aft-fuselage pod on a short horizontal pylon above the wing wake.
    const y = side * (D / 2 + nacR + 12);
    const zn = zc + 0.2 * D;
    const front = tail + 3.4 * D;
    nacelle(tag, y, zn, front);
    const pylon = [[front - 30, zn + 4], [front - 90, zn + 6], [front - 95, zn - 4], [front - 40, zn - 6]];
    paint('pylon-' + tag, loftY([[side * D * 0.3, pylon], [y, pylon]].map(([py, pts]) => [py, pts])));
  } else {
    const y = side * 0.33 * semi;
    const w = wingAt(y);
    const front = w.le + 0.55 * nacLen;
    const zn = w.z - 6 - nacR - 2;
    nacelle(tag, y, zn, front);
    const pylon = [[front - 0.2 * nacLen, zn + nacR - 4], [w.le - 50, w.z], [w.le - 90, w.z + 2], [front - 0.85 * nacLen, zn + nacR * 0.7]];
    paint('pylon-' + tag, loftY([[y - 4, pylon], [y + 4, pylon]]));
  }
}

// --- Tail ---------------------------------------------------------------------
const finRootZ = zc + 0.3 * D;
const finTopZ = rear ? 345 : 330;
const finRootLe = tail + (rear ? 2.5 : 2.1) * D;
const finSweep = rear ? 40 : 36;
const finTipLe = finRootLe - (finTopZ - finRootZ) * tan(finSweep);
livery('fin', loftZ([
  [finRootZ, foilXY(finRootLe, 0, rear ? 200 : 170, 12)],
  [finTopZ, foilXY(finTipLe, 0, rear ? 100 : 66, 7)],
]));
// The T-tail sits on the fin tip; the low tailplane on the tail cone.
const stabSemi = rear ? 170 : 165;
const stabLe = rear ? finTipLe + 5 : tail + 1.75 * D;
const stabZ = rear ? finTopZ - 3 : zc + 0.12 * D;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('tailplane-' + tag, loftY([
    [0, foilXZ(stabLe, stabZ, rear ? 105 : 100, 9)],
    [side * stabSemi, foilXZ(stabLe - stabSemi * tan(30), stabZ + stabSemi * tan(rear ? -2 : 6), 40, 4)],
  ]));
}

// --- Landing gear ---------------------------------------------------------------
const wheel = (name, x, y, r, w) => {
  dark(name, cylinder(w, r, 12).rotateX(90).translate(x, y + w / 2, r));
  metal(name + '-hub', cylinder(w + 2, r * 0.45, 8).rotateX(90).translate(x, y + (w + 2) / 2, r));
};
const noseX = nose - 0.12 * L;
metal('nose-gear-strut', bar([noseX, 0, 10], [noseX + 5, 0, zc - 0.45 * D], 3.5));
wheel('nose-wheel-port', noseX, -6, 10, 7);
wheel('nose-wheel-starboard', noseX, 6, 10, 7);
const mainX = rootLe - 0.62 * rootChord;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  const y = side * 95;
  metal('main-gear-strut-' + tag, bar([mainX, y, 15], [mainX + 4, y, wingAt(95).z - 5], 4));
  wheel('main-wheel-inner-' + tag, mainX, y - 7, 15, 10);
  wheel('main-wheel-outer-' + tag, mainX, y + 7, 15, 10);
}

return p.model();
