// Original kernelCAD low-poly park bench: two side frames from polygon
// profiles, timber seat slats and an optional slatted backrest.
// Millimetres, Z up, base on z = 0, seat top at about 450 mm.

meta({
  name: 'park-bench',
  license: 'CC0-1.0',
  title: 'Park bench',
  description: 'Slatted park bench with metal side frames and an optional backrest. Knobs: length, slat count, backrest, slat and frame colours.',
  tags: ['bench', 'seat', 'park', 'street', 'furniture', 'sitting'],
  kit: 'city-street',
  category: 'furniture',
  origin: 'base',
  compat: ['outdoor', 'street', 'park'],
  triangleBudget: 400,
});

const lengthMm = param('lengthMm', '1800', { choices: ['1200', '1500', '1800', '2100'], label: 'Length (mm)' });
const slats = param('slats', '4', { choices: ['3', '4', '5', '6'], label: 'Seat slats' });
const backrest = param('backrest', 'yes', { choices: ['yes', 'no'], label: 'Backrest' });
const wood = param('wood', '#a8703f', { label: 'Slats' });
const frame = param('frame', '#2a2c2e', { label: 'Frame' });

presets({
  green: { wood: '#a8703f', frame: '#1f4a30' },
  painted: { wood: '#2f6b4a', frame: '#202020' },
  red: { wood: '#9c2f27', frame: '#2a2c2e' },
});

const L = Number(lengthMm.value);
const n = Number(slats.value);
const hasBack = backrest.value === 'yes';

// Side-profile prism: points are (depth y, height z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const depth = 440; // seat depth (y from -220 to +220)
const seatTop = 450;
const slatT = 35;
const ft = 50; // frame bar thickness

// Leg-and-rail frame: front leg, rear leg, seat rail (a Π shape).
const legs: [number, number][] = [
  [-230, 0], [-170, 0], [-160, seatTop - slatT - 50], [150, seatTop - slatT - 50],
  [170, 0], [230, 0], [210, seatTop - slatT], [-215, seatTop - slatT],
];
// Backrest upright rising from the rear leg, leaning back about 15 degrees.
const upright: [number, number][] = [
  [170, seatTop - slatT - 50], [215, seatTop - slatT - 50], [330, 860], [285, 860],
];

const bench = assembly('park-bench');
// End frames; the slats run between their inner faces.
for (const [i, x0] of [[1, -L / 2], [2, L / 2 - ft]] as [number, number][]) {
  bench.part(`frame-${i}`, sideProfile(legs, x0, ft).color(frame));
  if (hasBack) bench.part(`upright-${i}`, sideProfile(upright, x0, ft).color(frame));
}

// Seat slats with small gaps.
const gap = 15;
const slatW = (depth - gap * (n - 1)) / n;
for (let i = 0; i < n; i++) {
  const y = -depth / 2 + slatW / 2 + i * (slatW + gap);
  bench.part(`seat-slat-${i + 1}`, box(L - 2 * ft, slatW, slatT, true).translate(0, y, seatTop - slatT / 2).color(wood));
}

if (hasBack) {
  const nb = Math.max(2, n - 1);
  const z0 = seatTop + 80;
  const z1 = 840;
  const bw = Math.min(110, (z1 - z0) / nb - 15);
  const lean = 115 / (860 - (seatTop - slatT - 50)); // dy per dz of the upright
  for (let i = 0; i < nb; i++) {
    const zc = z0 + bw / 2 + (i * (z1 - z0 - bw)) / Math.max(1, nb - 1);
    const yc = 192 + (zc - (seatTop - slatT - 50)) * lean - 25 - slatT / 2;
    bench.part(`back-slat-${i + 1}`, box(L - 2 * ft, slatT, bw, true).rotateX(-15).translate(0, yc, zc).color(wood));
  }
}

return bench.model();
