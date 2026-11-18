// SPDX-License-Identifier: CC0-1.0
// A water-cooled centrifugal chiller is recognizable by its paired shell-and-
// tube vessels, compressor package above them, refrigerant/water connections,
// and a separate controls cabinet. This generic scene prop models those parts
// as a joined low-poly package; it is not vendor geometry or a rated machine.
meta({
  name: 'centrifugal-chiller',
  license: 'CC0-1.0',
  title: 'Centrifugal chiller',
  description: 'Water-cooled chiller package with two dished shell-and-tube vessels, a centrifugal compressor and drive motor, connecting pipework, a controls cabinet and a supported skid. The compact/large shell choice changes vessel and frame geometry. Material controls separate shell steel, frame steel, compressor paint and pipework; plant, weathered, highVisibility and stainless presets.',
  tags: ['industrial plant', 'factory', 'process equipment', 'chiller', 'centrifugal', 'heat exchanger', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 4500
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shellCapacity = param('shellCapacity', 'large', { choices: ['compact', 'large'], label: 'Shell package' });
const shellSteel = param('shellSteel', '#607982', { label: 'Heat-exchanger shell steel' });
const frameSteel = param('frameSteel', '#343e43', { label: 'Skid and support steel' });
const compressorPaint = param('compressorPaint', '#3f6b53', { label: 'Compressor paint' });
const pipework = param('pipework', '#b7c0c2', { label: 'Pipework and flanges' });

presets({
  plant: { shellSteel: '#496e7a', frameSteel: '#343e43', compressorPaint: '#47765b', pipework: '#c0c6c4' },
  weathered: { shellSteel: '#59656a', frameSteel: '#454440', compressorPaint: '#4d5847', pipework: '#878b86' },
  highVisibility: { shellSteel: '#526f78', frameSteel: '#28343b', compressorPaint: '#f0b935', pipework: '#d5d7d1' },
  stainless: { shellSteel: '#c2c9c9', frameSteel: '#657177', compressorPaint: '#364653', pipework: '#e0e3e2' },
});

const large = shellCapacity.value === 'large';
const shellLength = large ? 820 : 680;
const shellRadius = large ? 142 : 122;
const baseLength = shellLength + 190;
const lowerZ = 238;
const upperZ = large ? 564 : 526;
const upperRadius = large ? 148 : 126;
const shellStart = -shellLength / 2;

const p = assembly('centrifugal-chiller');
const add = (name, shape, material) => {
  let finished;
  if (material === shellSteel) finished = shape.color(shellSteel);
  else if (material === frameSteel) finished = shape.color(frameSteel);
  else if (material === compressorPaint) finished = shape.color(compressorPaint);
  else if (material === pipework) finished = shape.color(pipework);
  else finished = shape.color(material);
  return p.part(name, finished.scale(scale));
};
const block = (x, y, z, sx, sy, sz) => box(sx, sy, sz, true).translate(x, y, z);
const key = (value) => String(value).replaceAll('-', 'm').replaceAll('.', 'p');

// Revolve a radius/axial profile around local Z. Turning the result onto X
// makes the two horizontal heat-exchanger barrels and their heads.
const turned = (points) => {
  let profile = path().moveTo(points[0][0], points[0][1]);
  for (const [radius, axial] of points.slice(1)) profile = profile.lineTo(radius, axial);
  return profile.close().revolve();
};
const alongX = (shape) => shape.rotateY(90);
const barrel = (radius, length) => turned([
  [0, 0], [radius * 0.62, 0], [radius * 0.9, 12], [radius, 30],
  [radius, length - 30], [radius * 0.9, length - 12], [radius * 0.62, length], [0, length],
]);
const dishedHead = (radius) => turned([
  [0, 0], [radius * 0.62, 0], [radius * 0.86, 8], [radius, 20],
  [radius * 0.94, 31], [radius * 0.72, 39], [0, 39],
]);
const ringX = (inner, outer, length, x, y, z) =>
  alongX(turned([[inner, 0], [outer, 0], [outer, length], [inner, length]])).translate(x, y, z);
const ringZ = (inner, outer, height, x, y, z) =>
  turned([[inner, 0], [outer, 0], [outer, height], [inner, height]]).translate(x, y, z);
const pipeY = (length, radius, x, y, z) => cylinder(length, radius).rotateX(90).translate(x, y, z);

// Welded skid, transverse cross members and isolator pads.
add('skid-left-rail', block(0, -205, 38, baseLength, 50, 44), frameSteel);
add('skid-right-rail', block(0, 205, 38, baseLength, 50, 44), frameSteel);
for (const x of [-baseLength * 0.38, 0, baseLength * 0.38]) {
  add(`skid-crossmember-${key(x)}`, block(x, 0, 38, 48, 445, 44), frameSteel);
}
for (const x of [-baseLength * 0.38, baseLength * 0.38]) {
  for (const y of [-205, 205]) add(`isolation-pad-${key(x)}-${key(y)}`, block(x, y, 12, 92, 78, 24), compressorPaint);
}

// Side stanchions and rails hold the upper vessel clear of the lower one.
for (const x of [-shellLength * 0.39, shellLength * 0.39]) {
  for (const y of [-shellRadius - 48, shellRadius + 48]) {
    add(`support-post-${key(x)}-${key(y)}`, block(x, y, 265, 34, 34, 420), frameSteel);
    add(`support-saddle-${key(x)}-${key(y)}`, block(x, y, upperZ - upperRadius - 8, 90, 74, 22), frameSteel);
  }
}
for (const y of [-shellRadius - 48, shellRadius + 48]) {
  add(`upper-crossrail-${key(y)}`, block(0, y, upperZ - upperRadius - 52, shellLength - 40, 30, 30), frameSteel);
}

const shell = (name, centerZ, radius, material) => {
  // The cylindrical courses have tapered/dished-looking shoulders, with
  // separate formed end heads and flange rings at each seam.
  const courseStart = shellStart + 28;
  const courseLength = shellLength - 56;
  add(`${name}-shell-course`, alongX(barrel(radius, courseLength)).translate(courseStart, 0, centerZ), material);
  add(`${name}-left-head`, alongX(dishedHead(radius)).translate(shellStart, 0, centerZ), material);
  add(`${name}-right-head`, alongX(dishedHead(radius)).translate(shellStart + shellLength - 39, 0, centerZ), material);
  for (const x of [shellStart + 24, shellStart + shellLength - 36]) {
    add(`${name}-head-flange-${key(x)}`, ringX(radius * 0.82, radius * 1.03, 14, x, 0, centerZ), pipework);
  }
  // Two slim reinforcement bands make the shell length and rolled steel legible.
  for (const x of [-shellLength * 0.24, shellLength * 0.24]) {
    add(`${name}-band-${key(x)}`, ringX(radius * 0.985, radius * 1.045, 10, x - 5, 0, centerZ), frameSteel);
  }
  // Water connections sit on the near side of each head, with raised flanges.
  for (const x of [-shellLength * 0.18, shellLength * 0.18]) {
    const nozzleY = -radius * 0.55;
    const nozzleZ = centerZ + radius * 0.72;
    add(`${name}-nozzle-${key(x)}`, cylinder(42, 24).translate(x, nozzleY, nozzleZ), pipework);
    add(`${name}-nozzle-flange-${key(x)}`, ringZ(24, 38, 12, x, nozzleY, nozzleZ + 32), pipework);
  }
};

shell('evaporator', lowerZ, shellRadius, shellSteel);
shell('condenser', upperZ, upperRadius, shellSteel);

// Centrifugal compressor and direct-drive motor on the upper vessel.
const compressorZ = upperZ + upperRadius + 108;
add('compressor-volute', alongX(turned([
  [0, 0], [72, 0], [94, 18], [102, 54], [92, 92], [66, 120], [0, 120],
])).translate(-128, 0, compressorZ), compressorPaint);
add('compressor-inlet-cover', ringX(42, 76, 18, -135, 0, compressorZ + 60), pipework);
add('compressor-discharge-nozzle', cylinder(74, 27).translate(-68, 0, compressorZ + 88), pipework);
add('drive-motor-frame', alongX(barrel(68, 182)).translate(-8, 0, compressorZ + 8), compressorPaint);
add('drive-motor-end-bell', alongX(dishedHead(68)).translate(160, 0, compressorZ + 8), frameSteel);
for (let x = 18; x <= 128; x += 22) {
  add(`drive-motor-fin-${key(x)}`, ringX(68, 75, 8, x, 0, compressorZ + 8), frameSteel);
}
add('motor-terminal-box', block(82, -78, compressorZ + 77, 94, 52, 42), compressorPaint);
add('motor-terminal-lid', block(82, -78, compressorZ + 100, 101, 58, 9), frameSteel);

// The near-side risers branch into both shell nozzles and the compressor.
const pipeLane = -upperRadius - 48;
for (const x of [-shellLength * 0.18, shellLength * 0.18]) {
  const lowerNozzleY = -shellRadius * 0.55;
  const lowerNozzleZ = lowerZ + shellRadius * 0.72;
  const upperNozzleY = -upperRadius * 0.55;
  const upperNozzleZ = upperZ + upperRadius * 0.72;
  add(`lower-shell-branch-${key(x)}`, pipeY(Math.abs(pipeLane) + lowerNozzleY, 18, x, pipeLane, lowerNozzleZ), pipework);
  add(`upper-shell-branch-${key(x)}`, pipeY(Math.abs(pipeLane) + upperNozzleY, 18, x, pipeLane, upperNozzleZ), pipework);
  add(`compressor-riser-${key(x)}`, cylinder(compressorZ + 42 - lowerNozzleZ, 18).translate(x, pipeLane, lowerNozzleZ), pipework);
  add(`compressor-connection-${key(x)}`, pipeY(Math.abs(pipeLane), 18, x, pipeLane, compressorZ + 60), pipework);
}

// Controls cabinet, access panels, status screen and three indicator lamps.
const cabinetX = shellLength * 0.33;
add('controls-cabinet', block(cabinetX, -upperRadius - 115, upperZ + 36, 150, 86, 208), compressorPaint);
add('controls-door', block(cabinetX, -upperRadius - 160, upperZ + 35, 134, 8, 184), frameSteel);
add('controller-display', block(cabinetX, -upperRadius - 166, upperZ + 82, 70, 5, 46), pipework);
add('display-screen', block(cabinetX, -upperRadius - 170, upperZ + 82, 58, 3, 34), '#243c48');
for (let i = 0; i < 3; i++) {
  add(`status-lamp-${i}`, cylinder(12, 8).translate(cabinetX - 42 + i * 38, -upperRadius - 170, upperZ - 12), i === 0 ? '#54bd7a' : (i === 1 ? '#e6bb49' : '#c65b4d'));
}
add('cabinet-handle', block(cabinetX + 47, -upperRadius - 172, upperZ + 20, 7, 6, 50), pipework);
add('cabinet-base', block(cabinetX, -upperRadius - 115, upperZ - 82, 170, 98, 22), frameSteel);

return p.model();
