// SPDX-License-Identifier: CC0-1.0
// Cargo aircraft: a military-style strategic freighter. It reads as a
// freighter, not an airliner, because of the fat, low-slung lofted fuselage
// with a blunt nose and a sharply upswept rear over a loading ramp, the high
// shoulder wing with anhedral so the four engines hang clear of the ground,
// the T-tail lifted out of the way of the ramp, and the main gear tucked into
// blister sponsons on the lower fuselage sides instead of under the wing.
// Stylized catalog geometry, millimetres, Z up, nose towards +X, tyres on z = 0.
meta({
  name: 'cargo-aircraft',
  license: 'CC0-1.0',
  title: 'Cargo aircraft',
  description: 'High-wing four-engine military freighter with a broad lofted fuselage, blunt nose, upswept rear with a loading ramp, anhedral shoulder wing, T-tail, gear sponsons with tandem main wheels and wraparound cockpit glass. Shape choices: turbofan pods or eight-blade turboprops; rear ramp closed or lowered. Material controls: airframe paint, marking paint, cockpit glass, bare metal and tyre rubber; weathered and high-visibility presets.',
  tags: ['airfield', 'aviation', 'airport', 'cargo aircraft', 'freighter', 'airlifter', 'military transport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const propulsion = param('propulsion', 'turbofan', { choices: ['turbofan', 'turboprop'], label: 'Engines' });
const ramp = param('ramp', 'closed', { choices: ['closed', 'open'], label: 'Rear ramp' });
const airframePaint = param('airframePaint', '#6f7f8c', { label: 'Airframe paint' });
const liveryPaint = param('liveryPaint', '#4f5d68', { label: 'Marking paint (fin, nacelles, sponsons)' });
const canopyGlass = param('canopyGlass', '#253844', { label: 'Cockpit glass' });
const bareMetal = param('bareMetal', '#aab5b8', { label: 'Bare metal' });
const rubber = param('rubber', '#292f32', { label: 'Tyre rubber, fan faces and propellers' });

presets({
  weathered: {
    airframePaint: '#596765',
    liveryPaint: '#46514f',
    canopyGlass: '#2c3a40',
    bareMetal: '#6f7b7e',
    rubber: '#202528',
  },
  highVisibility: {
    airframePaint: '#e9e8df',
    liveryPaint: '#d9482b',
    canopyGlass: '#1f3d4f',
    bareMetal: '#c0c9cb',
    rubber: '#262b2e',
  },
});

const p = assembly('cargo-aircraft');
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
const D = 190; // fuselage diameter
const zc = 128; // fuselage centreline height: the hold floor sits low
const L = 1480;
const nose = L / 2;
const tail = -L / 2;
const open = ramp.value === 'open';
// [distance from the end in D, centre offset in D, half-width in D, half-height in D]
const NOSE = [[0, -0.06, 0.06, 0.06], [0.2, -0.03, 0.33, 0.31], [0.55, 0, 0.45, 0.45], [1.0, 0, 0.5, 0.5]];
// The rear sweeps up hard: the belly line rises over the ramp to a high tail.
const TAIL = [[0, 0.5, 0.06, 0.07], [0.5, 0.44, 0.16, 0.14], [1.4, 0.32, 0.3, 0.22], [2.3, 0.15, 0.44, 0.36], [3.1, 0.02, 0.5, 0.49], [3.5, 0, 0.5, 0.5]];
const station = (x, [, dz, ry, rz]) => [x, ring(0, zc + dz * D, ry * D, rz * D)];
const hull = loftX([
  ...TAIL.map((s) => station(tail + s[0] * D, s)),
  ...NOSE.map((s) => station(nose - s[0] * D, s)),
]);
// Ramp hinged at the aft end of the hold floor; open, the hold is cut away
// behind it and the ramp slopes down to the ground.
const hingeX = tail + 3.0 * D;
const hingeZ = zc - 0.48 * D;
const bayLen = 1.9 * D;
if (open) {
  const bay = box(bayLen, 0.72 * D, 0.5 * D, true).translate(hingeX - bayLen / 2, 0, hingeZ + 0.25 * D - 6);
  paint('fuselage', hull.subtract(bay));
  // Dark hold ceiling, kept forward of where the rising belly would expose it.
  dark('cargo-hold', box(0.9 * D, 0.7 * D, 4, true).translate(hingeX - 0.45 * D + 10, 0, hingeZ + 0.5 * D - 8));
  const rampLen = 175;
  const drop = (Math.asin((hingeZ - 3) / rampLen) * 180) / Math.PI;
  paint('cargo-ramp', box(rampLen, 0.68 * D, 9, true).translate(-rampLen / 2, 0, 0).rotateY(-drop).translate(hingeX, 0, hingeZ));
  metal('ramp-toes', box(20, 0.6 * D, 3, true).translate(hingeX - rampLen * Math.cos((drop * Math.PI) / 180) - 8, 0, 1.5));
} else {
  paint('fuselage', hull);
  // Closed ramp seam: a thin marking band round the upswept belly.
  livery('ramp-seam', loftX([hingeX - 4, hingeX + 4].map((x) => {
    const s = tableAt(TAIL, (x - tail) / D);
    return [x, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 200, 340, 0.6, 1.4, 6)];
  })));
}
glass('cockpit-glass', loftX([0.34, 0.46, 0.58].map((d) => {
  const s = tableAt(NOSE, d);
  return [nose - d * D, arcBand(zc + s[1] * D, s[2] * D, s[3] * D, 26, 154)];
})));
// Gear sponsons: blisters along the lower fuselage sides over the main wheels.
const mainX = -40;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  const y = side * 0.44 * D;
  livery('gear-sponson-' + tag, loftX([
    [mainX + 1.2 * D, ring(y, zc - 0.3 * D, 4, 4, 10)],
    [mainX + 0.8 * D, ring(y, zc - 0.32 * D, 0.2 * D, 0.16 * D, 10)],
    [mainX - 0.6 * D, ring(y, zc - 0.32 * D, 0.2 * D, 0.16 * D, 10)],
    [mainX - 1.0 * D, ring(y, zc - 0.3 * D, 4, 4, 10)],
  ]));
}

// --- High wing with anhedral ------------------------------------------------------
const semi = 725;
const rootLe = nose - 0.38 * L;
const rootChord = 290;
const wingZ = zc + 0.44 * D;
const anhedral = -3;
const sweep = 25;
const wingAt = (y) => ({ le: rootLe - Math.abs(y) * tan(sweep), z: wingZ + Math.abs(y) * tan(anhedral) });
const wingStations = (side) => [
  [0, rootChord, 34],
  [0.35 * semi, 200, 24],
  [semi, 84, 9],
].map(([y, c, t]) => [side * y, foilXZ(wingAt(y).le, wingAt(y).z, c, t)]);
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('wing-' + tag, loftY(wingStations(side)));
  const tip = wingAt(semi);
  livery('winglet-' + tag, loftZ([
    [tip.z, foilXY(tip.le - 2, side * (semi - 2), 80, 4)],
    [tip.z + 60, foilXY(tip.le - 50, side * (semi + 4), 34, 2)],
  ]));
}
// Wing-to-body fairing on the crown.
paint('wing-fairing', loftX([
  [rootLe + 40, ring(0, zc + 0.36 * D, 6, 6, 10)],
  [rootLe - 40, ring(0, zc + 0.4 * D, 0.24 * D, 0.14 * D, 10)],
  [rootLe - rootChord + 20, ring(0, zc + 0.4 * D, 0.24 * D, 0.14 * D, 10)],
  [rootLe - rootChord - 60, ring(0, zc + 0.36 * D, 6, 6, 10)],
]));

// --- Engines -------------------------------------------------------------------
const fan = propulsion.value === 'turbofan';
const engine = (tag, y) => {
  const w = wingAt(y);
  const nacR = fan ? 34 : 22;
  const nacLen = fan ? 180 : 170;
  const front = w.le + (fan ? 0.55 : 0.4) * nacLen;
  const zn = w.z - 14 - nacR;
  const shell = loftX([
    [front, ring(y, zn, nacR * 0.9, nacR * 0.9, 14)],
    [front - 0.12 * nacLen, ring(y, zn, nacR, nacR, 14)],
    [front - 0.6 * nacLen, ring(y, zn, nacR * 0.94, nacR * (fan ? 0.94 : 1.2), 14)],
    [front - nacLen, ring(y, zn, nacR * 0.6, nacR * 0.6, 14)],
  ]);
  const pylon = [[front - 0.3 * nacLen, zn + nacR - 4], [w.le - 60, w.z], [w.le - 140, w.z], [front - 0.85 * nacLen, zn + nacR * 0.6]];
  paint('pylon-' + tag, loftY([[y - 6, pylon], [y + 6, pylon]]));
  if (fan) {
    const intake = cylinder(40, nacR * 0.74, 14).rotateY(90).translate(front - 34, y, zn);
    livery('nacelle-' + tag, shell.subtract(intake));
    dark('fan-face-' + tag, cylinder(4, nacR * 0.74, 14).rotateY(90).translate(front - 36, y, zn));
    metal('spinner-' + tag, loftX([[front - 34, ring(y, zn, 9, 9, 8)], [front - 18, ring(y, zn, 1, 1, 8)]]));
    metal('exhaust-cone-' + tag, loftX([[front - nacLen - 1, ring(y, zn, nacR * 0.42, nacR * 0.42, 10)], [front - nacLen - 30, ring(y, zn, 3, 3, 10)]]));
  } else {
    livery('nacelle-' + tag, shell);
    metal('spinner-' + tag, loftX([[front, ring(y, zn, nacR * 0.75, nacR * 0.75, 10)], [front + 30, ring(y, zn, 2, 2, 10)]]));
    // Eight scimitar-ish blades: thin twisted paddles round the spinner.
    for (let i = 0; i < 8; i++) {
      dark('propeller-blade-' + tag + '-' + (i + 1), box(4, 12, 74, true).rotateZ(18).translate(0, 0, 40).rotateX(i * 45).translate(front + 10, y, zn));
    }
  }
};
for (const [pos, f] of [['inner', 0.25], ['outer', 0.48]]) {
  engine(pos + '-starboard', f * semi);
  engine(pos + '-port', -f * semi);
}

// --- T-tail ----------------------------------------------------------------------
const finRootZ = zc + 0.62 * D;
const finTopZ = 590;
const finRootLe = tail + 2.0 * D;
const finSweep = 38;
const finTipLe = finRootLe - (finTopZ - finRootZ) * tan(finSweep);
livery('fin', loftZ([
  [finRootZ, foilXY(finRootLe, 0, 280, 18)],
  [finTopZ, foilXY(finTipLe, 0, 160, 12)],
]));
const stabSemi = 300;
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  paint('tailplane-' + tag, loftY([
    [0, foilXZ(finTipLe + 10, finTopZ - 4, 170, 14)],
    [side * stabSemi, foilXZ(finTipLe + 10 - stabSemi * tan(28), finTopZ - 4 + stabSemi * tan(-3), 70, 6)],
  ]));
}

// --- Landing gear ---------------------------------------------------------------
const wheel = (name, x, y, r, w) => {
  dark(name, cylinder(w, r, 12).rotateX(90).translate(x, y + w / 2, r));
  metal(name + '-hub', cylinder(w + 2, r * 0.45, 8).rotateX(90).translate(x, y + (w + 2) / 2, r));
};
const noseX = nose - 0.12 * L;
metal('nose-gear-strut', bar([noseX, 0, 14], [noseX + 4, 0, zc - 0.42 * D], 5));
wheel('nose-wheel-port', noseX, -9, 14, 10);
wheel('nose-wheel-starboard', noseX, 9, 14, 10);
// Three tandem wheel pairs per side under each sponson.
for (const [tag, side] of [['starboard', 1], ['port', -1]]) {
  for (const [i, dx] of [70, 0, -70].entries()) {
    wheel('main-wheel-' + tag + '-' + (i + 1), mainX + dx, side * 0.44 * D, 22, 22);
  }
}

return p.model();
