// SPDX-License-Identifier: CC0-1.0
// Hard-shell spinner suitcase. What makes it one rather than a box on wheels:
// two moulded clamshell halves with rounded corners and raised vertical ribs,
// a fabric zip band running round the seam where they meet, four twin-wheel
// spinner casters in corner housings, a two-stage telescoping trolley handle
// rising out of a recessed channel on the back, and a moulded carry grip on
// top and on the side. A TSA combination lock sits on the top edge of the band.
// Generic visualization geometry at real size (cabin case 400 x 230 x 550 mm
// shell), millimetres, Z up, wheels on z = 0, front facing -Y.
meta({
  name: 'rolling-suitcase',
  license: 'CC0-1.0',
  title: 'Rolling suitcase',
  description: 'Hard-shell spinner suitcase: two ribbed clamshell halves with rounded corners, fabric zip band round the seam, TSA lock, four twin-wheel spinner casters, two-stage telescoping trolley handle and moulded top and side grips. Cabin or check-in size, handle retracted or extended. Material controls: shell polycarbonate, zip band fabric, handle aluminium, wheels and grips rubber; midnight, coral and aluminium presets.',
  tags: ['rolling suitcase', 'carry-on', 'luggage', 'spinner wheels', 'hard shell', 'trolley', 'travel', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airport', 'hotel'],
  triangleBudget: 2600,
});

const size = param('size', 'cabin', { choices: ['cabin', 'check-in'], label: 'Case size' });
const handle = param('handle', 'extended', { choices: ['retracted', 'extended'], label: 'Trolley handle' });
const shell = param('shell', '#2f6f8f', { label: 'Shell (polycarbonate)' });
const zipBand = param('zipBand', '#22272c', { label: 'Zip band (nylon fabric)' });
const aluminium = param('aluminium', '#b7bec4', { label: 'Trolley handle and lock (aluminium)' });
const rubber = param('rubber', '#1b1d20', { label: 'Wheels, casters and grips (rubber)' });
presets({
  midnight: { shell: '#1f2530', zipBand: '#15181c', aluminium: '#8c949b', rubber: '#121315' },
  coral: { shell: '#e0705f', zipBand: '#3a2e2c', aluminium: '#d2d6d9', rubber: '#2a2626' },
  aluminium: { shell: '#c4cacf', zipBand: '#2b2f33', aluminium: '#e4e7ea', rubber: '#202224' },
});

const p = assembly('rolling-suitcase');
const add = (name, shape) => p.part(name, shape);
const checkIn = size.value === 'check-in';
const W = checkIn ? 480 : 400;   // shell width (X)
const D = checkIn ? 290 : 230;   // shell depth (Y), both halves
const H = checkIn ? 700 : 550;   // shell height (Z)
const R = 70;                    // corner radius of the clamshell
const LIFT = 75;                 // shell bottom above the floor
const ZC = LIFT + H / 2;
const BAND = 26;                 // zip band depth
const half = (D - BAND) / 2;

// Rounded-rect slab facing Y: width along X, height along Z, centred, y from y0 for t.
const slabY = (w, h, r, t, y0, zc) => extrudeRoundedRect(w, h, r, t, { axis: 'y' }).translate(0, y0, zc);

// Front and back clamshells, each slightly domed: a full slab plus a smaller face slab.
add('front-shell', slabY(W, H, R, half - 10, -D / 2 + 10, ZC).color(shell));
add('front-face', slabY(W - 24, H - 24, R - 12, 10, -D / 2, ZC).color(shell));
add('back-shell', slabY(W, H, R, half - 10, BAND / 2, ZC).color(shell));
add('back-face', slabY(W - 24, H - 24, R - 12, 10, D / 2 - 10, ZC).color(shell));
// Zip band round the seam, a little proud of the shells.
add('zip-band', slabY(W + 6, H + 6, R + 3, BAND, -BAND / 2, ZC).color(zipBand));

// Raised vertical ribs moulded into the front shell.
for (const x of [-0.3, -0.1, 0.1, 0.3]) {
  add(`front-rib-${Math.round(x * 10)}`, slabY(26, H - 120, 13, 8, -D / 2 - 6, ZC).translate(x * W, 0, 0).color(shell));
}

// TSA combination lock on the top of the band, with three dials.
add('tsa-lock', box(70, BAND + 8, 18, true).translate(W * 0.22, 0, LIFT + H + 9).color(aluminium));
for (const [i, x] of [-16, 0, 16].entries()) {
  add(`lock-dial-${i}`, cylinder(10, 7, 10).rotateX(90).translate(W * 0.22 + x, -BAND / 2 - 4, LIFT + H + 9).color(rubber));
}

// Moulded top carry grip: two posts and a bar.
const gripZ = LIFT + H;
for (const sx of [-1, 1]) add(`top-grip-post-${sx}`, box(22, 30, 30, true).translate(sx * 70, -D * 0.22, gripZ + 12).color(rubber));
add('top-grip-bar', extrudeRoundedRect(170, 30, 12, 20).translate(0, -D * 0.22, gripZ + 24).color(rubber));
// Side carry grip on the -X face.
for (const sz of [-1, 1]) add(`side-grip-post-${sz}`, box(28, 30, 22, true).translate(-W / 2 - 10, 0, ZC + sz * 70).color(rubber));
add('side-grip-bar', extrudeRoundedRect(30, 170, 12, 20, { axis: 'x' }).translate(-W / 2 - 34, 0, ZC).color(rubber));

// Trolley channel on the back and a two-stage telescoping handle.
const TX = W * 0.3;
const TY = D / 2 + 8;
add('trolley-channel', slabY(2 * TX + 60, H - 40, 20, 8, D / 2 - 2, ZC).color(zipBand));
const stage = handle.value === 'extended' ? 300 : 0;
for (const sx of [-1, 1]) {
  const x = sx * TX;
  add(`trolley-outer-${sx}`, box(30, 18, H - 60, true).translate(x, TY, LIFT + 30 + (H - 60) / 2).color(aluminium));
  if (stage > 0) add(`trolley-inner-${sx}`, box(22, 13, stage + 20, true).translate(x, TY, LIFT + H + (stage + 20) / 2 - 20).color(aluminium));
}
const topZ = LIFT + H + stage;
add('trolley-grip', extrudeRoundedRect(2 * TX + 40, 42, 16, 34).translate(0, TY, topZ).color(rubber));
add('trolley-button', box(60, 12, 8, true).translate(0, TY, topZ + 36).color(aluminium));

// Four spinner casters: housing moulded into the shell corner, swivel fork, twin wheels.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const cx = sx * (W / 2 - 50);
  const cy = sy * (D / 2 - 45);
  add(`caster-housing-${sx}-${sy}`, extrudeRoundedRect(84, 76, 22, 22).translate(cx, cy, LIFT - 12).color(rubber));
  add(`caster-swivel-${sx}-${sy}`, cylinder(14, 16, 10).translate(cx, cy, LIFT - 26).color(aluminium));
  add(`caster-fork-${sx}-${sy}`, box(18, 40, 28, true).translate(cx, cy, LIFT - 38).color(rubber));
  for (const side of [-1, 1]) {
    add(`wheel-${sx}-${sy}-${side}`, cylinder(16, 25, 16).rotateY(90).translate(cx + side * 9 + (side < 0 ? -16 : 0), cy, 25).color(rubber));
    add(`hub-${sx}-${sy}-${side}`, cylinder(17, 10, 8).rotateY(90).translate(cx + side * 9 + (side < 0 ? -17 : 0), cy, 25).color(aluminium));
  }
}

return p.model();
