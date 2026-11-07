// SPDX-License-Identifier: CC0-1.0
// Private jet: a long-range business jet. It reads as a bizjet, not a small
// airliner, because of the long pointed nose and long tapering tail cone on a
// slim lofted fuselage, the row of separate oval cabin windows instead of a
// window band, the two engine pods on the aft fuselage, the swept T-tail (or
// cruciform tail) and the tall winglets on a clean wing with no engines under
// it, sitting low on short gear.
// Stylized catalog geometry, millimetres, Z up, nose towards +X, tyres on z = 0.
meta({
  name: 'private-jet',
  license: 'CC0-1.0',
  title: 'Private jet',
  description: 'Long-range business jet with a slim lofted fuselage, pointed nose and long tail cone, oval cabin windows, wraparound cockpit glass, clean swept wing with tall winglets, two rear-fuselage engine pods with open intakes, swept T-tail and short dual-wheel gear. Shape choices: T-tail or cruciform tail; winglets or plain tips. Material controls: airframe paint, livery paint, cockpit and cabin glass, bare aluminium and tyre rubber; weathered and high-visibility presets.',
  tags: ['airfield', 'aviation', 'airport', 'business jet', 'private jet', 'bizjet', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const tailType = param('tail', 't-tail', { choices: ['t-tail', 'cruciform'], label: 'Tail layout' });
const wingtips = param('wingtips', 'winglets', { choices: ['winglets', 'plain'], label: 'Wingtips' });
const airframePaint = param('airframePaint', '#ebe9e0', { label: 'Airframe paint' });
const liveryPaint = param('liveryPaint', '#9a7a42', { label: 'Livery paint (fin, pods, cheatline)' });
const canopyGlass = param('canopyGlass', '#253844', { label: 'Cockpit and cabin glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare aluminium' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber and fan faces' });

presets({
  weathered: {
    airframePaint: '#b9b7ad',
    liveryPaint: '#5d5546',
    canopyGlass: '#2c3a40',
    bareMetal: '#6f7b7e',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#f4f3ee',
    liveryPaint: '#d23a2a',
    canopyGlass: '#1f3d4f',
    bareMetal: '#c0c9cb',
    rubber: '#262b2e',
  },
});

const p = assembly('private-jet');
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
const D = 92; // fuselage diameter
const zc = 80; // fuselage centreline height
const L = 1050;
const nose = L / 2;
const tail = -L / 2;
// [distance from the end in D, centre offset in D, half-width in D, half-height in D]
const NOSE = [[0, -0.15, 0.04, 0.04], [0.3, -0.1, 0.25, 0.22], [0.8, -0.05, 0.4, 0.38], [1.4, -0.01, 0.48, 0.48], [2.0, 0, 0.5, 0.5]];
const TAIL = [[0, 0.25, 0.05, 0.06], [0.6, 0.22, 0.16, 0.17], [2.0, 0.12, 0.33, 0.36], [3.4, 0.04, 0.46, 0.46], [4.4, 0, 0.5, 0.5]];
const station = (x, [, dz, ry, rz]) => [x, ring(0, zc + dz * D, ry * D, rz * D)];
paint('fuselage', loftX([
  ...TAIL.map((s) => station(tail + s[0] * D, s)),
  ...NOSE.map((s) => station(nose - s[0] * D, s)),
]));
glass('cockpit-glass', loftX([0.95, 1.1, 1.25].map((d) => {
  const s = tableAt(NOSE, d);
  return [nose - d * D, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 20, 160)];
})));
// Separate oval cabin windows, then a livery cheatline under them.
const firstWindow = nose - 2.3 * D;
for (const [tag, win, cheat] of [['starboard', [2, 16], [-12, -6]], ['port', [164, 178], [186, 192]]]) {
  for (let i = 0; i < 7; i++) {
    const x = firstWindow - i * 46;
    glass('cabin-window-' + tag + '-' + (i + 1), loftX([x, x - 16].map((wx) => [wx, arcBand(zc, D / 2, D / 2, ...win, 0.5, 1.4, 3)])));
  }
  const run = [tail + 4.4 * D, nose - 2.0 * D];
  livery('cheatline-' + tag, loftX(run.map((x) => [x, arcBand(zc, D / 2, D / 2, ...cheat, 0.6, 1.4, 2)])));
}
metal('apu-exhaust', cylinder(8, 3.5, 8).rotateY(-90).translate(tail + 2, 0, zc + 0.25 * D));

// --- Wing ----------------------------------------------------------------------
const semi = 520;
const rootLe = nose - 0.5 * L;
const rootChord = 175;
const wingZ = zc - 0.32 * D;
const dihedral = 3;
const sweep = 33;
const tipChord = 44;
const wingAt = (y) => ({ le: rootLe - Math.abs(y) * tan(sweep), z: wingZ + Math.abs(y) * tan(dihedral) });
const wingStations = (side) => [
  [0, rootChord, 20],
  [0.3 * semi, 110, 12],
  [semi, tipChord, 5],
].map(([y, c, t]) => [side * y, foilXZ(wingAt(y).le, wingAt(y).z, c, t)]);
const tipLe = wingAt(semi).le;
const tipZ = wingAt(semi).z;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('wing-' + tag, loftY(wingStations(side)));
  metal('leading-edge-' + tag, loftY([[side * 50, foilXZ(wingAt(50).le + 2, wingAt(50).z, 16, 12)], [side * (semi - 14), foilXZ(wingAt(semi - 14).le + 2, wingAt(semi - 14).z, 10, 5)]]));
  if (wingtips.value === 'winglets') {
    livery('winglet-' + tag, loftZ([
      [tipZ, foilXY(tipLe - 2, side * (semi - 2), tipChord - 4, 3)],
      [tipZ + 78, foilXY(tipLe - 58, side * (semi + 8), 20, 2)],
    ]));
  }
}

// --- Engines on the aft fuselage --------------------------------------------------
const nacR = 26;
const nacLen = 125;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  const y = side * (D / 2 + nacR + 10);
  const zn = zc + 0.22 * D;
  const front = tail + 3.9 * D;
  const shell = loftX([
    [front, ring(y, zn, nacR * 0.9, nacR * 0.9, 14)],
    [front - 0.12 * nacLen, ring(y, zn, nacR, nacR, 14)],
    [front - 0.6 * nacLen, ring(y, zn, nacR * 0.94, nacR * 0.94, 14)],
    [front - nacLen, ring(y, zn, nacR * 0.62, nacR * 0.62, 14)],
  ]);
  const intake = cylinder(30, nacR * 0.74, 14).rotateY(90).translate(front - 25, y, zn);
  livery('engine-pod-' + tag, shell.subtract(intake));
  dark('fan-face-' + tag, cylinder(4, nacR * 0.74, 14).rotateY(90).translate(front - 27, y, zn));
  metal('spinner-' + tag, loftX([[front - 25, ring(y, zn, 7, 7, 8)], [front - 13, ring(y, zn, 1, 1, 8)]]));
  metal('thrust-reverser-' + tag, loftX([[front - nacLen + 1, ring(y, zn, nacR * 0.64, nacR * 0.64, 12)], [front - nacLen - 14, ring(y, zn, nacR * 0.5, nacR * 0.5, 12)]]));
  const pylon = [[front - 35, zn + 4], [front - 95, zn + 6], [front - 100, zn - 4], [front - 45, zn - 6]];
  paint('pylon-' + tag, loftY([[side * D * 0.3, pylon], [y, pylon]]));
}

// --- Tail ---------------------------------------------------------------------
const finRootZ = zc + 0.25 * D;
const finTopZ = 275;
const finRootLe = tail + 2.6 * D;
const finRootChord = 175;
const finSweep = 45;
const finLeAt = (z) => finRootLe - (z - finRootZ) * tan(finSweep);
livery('fin', loftZ([
  [finRootZ, foilXY(finRootLe, 0, finRootChord, 11)],
  [finTopZ, foilXY(finLeAt(finTopZ), 0, 78, 6)],
]));
// T-tail on the fin tip, or a cruciform tailplane part-way up the fin.
const tee = tailType.value === 't-tail';
const stabZ = tee ? finTopZ - 3 : finRootZ + 0.4 * (finTopZ - finRootZ);
const stabLe = finLeAt(stabZ) + (tee ? 4 : -10);
const stabSemi = 175;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('tailplane-' + tag, loftY([
    [0, foilXZ(stabLe, stabZ, tee ? 90 : 110, 8)],
    [side * stabSemi, foilXZ(stabLe - stabSemi * tan(32), stabZ + stabSemi * tan(tee ? -2 : 3), 38, 4)],
  ]));
}
if (tee) livery('fin-bullet', loftX([[stabLe + 22, ring(0, finTopZ, 2, 2, 8)], [stabLe - 10, ring(0, finTopZ, 7, 6, 8)], [stabLe - 90, ring(0, finTopZ, 5, 4, 8)]]));

// --- Landing gear ---------------------------------------------------------------
const wheel = (name, x, y, r, w) => {
  dark(name, cylinder(w, r, 12).rotateX(90).translate(x, y + w / 2, r));
  metal(name + '-hub', cylinder(w + 2, r * 0.45, 8).rotateX(90).translate(x, y + (w + 2) / 2, r));
};
const noseX = nose - 0.15 * L;
metal('nose-gear-strut', bar([noseX, 0, 8], [noseX + 4, 0, zc - 0.45 * D], 3));
wheel('nose-wheel-port', noseX, -5, 8, 6);
wheel('nose-wheel-starboard', noseX, 5, 8, 6);
const mainX = rootLe - 0.6 * rootChord;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  const y = side * 80;
  metal('main-gear-strut-' + tag, bar([mainX, y, 12], [mainX + 4, y, wingAt(80).z - 5], 3.5));
  wheel('main-wheel-inner-' + tag, mainX, y - 6, 12, 9);
  wheel('main-wheel-outer-' + tag, mainX, y + 6, 12, 9);
}

return p.model();
