// SPDX-License-Identifier: CC0-1.0
// Olympic barbell loaded with bumper plates, resting on the floor: what makes
// it one is the long 28 mm shaft with knurled grip zones and a centre knurl,
// the fat inner collars, the 50 mm rotating sleeves that carry the plates, and
// the 450 mm rubber bumpers that hold the bar off the floor at a standard
// height, locked on with collar clamps. Generic visualization geometry at about
// real size (a 20 kg bar is 2.2 m long), millimetres, Z up, plates on z = 0.
meta({
  name: 'barbell',
  license: 'CC0-1.0',
  title: 'Barbell',
  description: "Olympic 20 kg barbell at about real size on 450 mm bumper plates: 28 mm shaft with centre and grip knurling and ring marks, inner collars, 50 mm sleeves with end caps, recessed rubber bumpers with steel hubs and painted rim rings, and lock-jaw collar clamps. The load choice (empty to 140 kg) stacks the real plate set. Material controls: bar chrome, knurl, bumper rubber, plate and collar accent; competitionBlue, oldIron and weathered presets.",
  tags: ['barbell', 'olympic bar', 'bumper plates', 'weightlifting', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const load = param('load', '100kg', { choices: ['empty', '60kg', '100kg', '140kg'], label: 'Plate load' });
const chromedSteel = param('chromedSteel', '#b9c2c6', { label: 'Bar chrome' });
const knurlSteel = param('knurlSteel', '#7f888c', { label: 'Knurled grip steel' });
const bumperRubber = param('bumperRubber', '#2b2f33', { label: 'Bumper plate rubber' });
const plateAccent = param('plateAccent', '#e0e3e2', { label: 'Plate rings and collar clamps' });
presets({
  clubColors: { bumperRubber: '#3b6b8b' },
  competitionBlue: { bumperRubber: '#2e5fa8', plateAccent: '#f4f2ea', chromedSteel: '#d3d9dc' },
  oldIron: { bumperRubber: '#3a3a38', plateAccent: '#8e8a80', chromedSteel: '#8c9295', knurlSteel: '#5c6265' },
  weathered: { bumperRubber: '#4a4743', plateAccent: '#a39e8e', chromedSteel: '#959889', knurlSteel: '#6a6a60' },
});

const p = assembly('barbell');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[r, x], ...] revolved about the X axis (the bar axis).
const turnedX = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateY(90);
};
const rodX = (x0, x1, r, n = 14) => cylinder(x1 - x0, r, n).rotateY(90).translate(x0, 0, AXIS_Z);

const PLATE_R = 225;            // 450 mm bumper
const AXIS_Z = PLATE_R;         // bar centre height with plates on the floor
const SHAFT_HALF = 655;         // half the distance between the inner collars
const SLEEVE_END = 1100;

// Shaft, centre knurl and the two grip knurls (split at the 910 mm ring marks).
add('shaft', rodX(-SHAFT_HALF, SHAFT_HALF, 14).color(chromedSteel));
add('centre-knurl', rodX(-60, 60, 14.5).color(knurlSteel));
for (const sx of [-1, 1]) {
  const side = sx < 0 ? 'left' : 'right';
  for (const [i, [a, b]] of [[100, 452], [458, 640]].entries()) {
    const [x0, x1] = sx < 0 ? [-b, -a] : [a, b];
    add(`${side}-knurl-${i + 1}`, rodX(x0, x1, 14.5).color(knurlSteel));
  }
}

// Inner collars and sleeves with end caps.
for (const sx of [-1, 1]) {
  const side = sx < 0 ? 'left' : 'right';
  const cp = [[0, 0], [20, 0], [40, 6], [40, 30], [0, 30]];
  add(`${side}-inner-collar`, turnedX(sx < 0 ? cp.map(([r, z]) => [r, -z]) : cp).translate(sx * SHAFT_HALF, 0, AXIS_Z).color(chromedSteel));
  const s0 = SHAFT_HALF + 30;
  add(`${side}-sleeve`, (sx < 0 ? rodX(-SLEEVE_END, -s0, 25, 18) : rodX(s0, SLEEVE_END, 25, 18)).color(chromedSteel));
  const ep = [[0, 0], [26.5, 0], [26.5, 6], [22, 9], [0, 9]];
  add(`${side}-end-cap`, turnedX(sx < 0 ? ep.map(([r, z]) => [r, -z]) : ep).translate(sx * SLEEVE_END, 0, AXIS_Z).color(chromedSteel));
}

// Bumper plates: rubber disc, steel hub insert, painted face ring.
const PLATES = { empty: [], '60kg': [54], '100kg': [54, 54], '140kg': [67, 67, 36] }[load.value];
for (const sx of [-1, 1]) {
  const side = sx < 0 ? 'left' : 'right';
  let x = SHAFT_HALF + 32;
  for (const [i, t] of PLATES.entries()) {
    const x0 = sx < 0 ? -x - t : x;
    add(`${side}-plate-${i + 1}`, rodX(x0, x0 + t, PLATE_R, 32).color(bumperRubber));
    // Steel hub insert standing a little proud of the rubber.
    add(`${side}-plate-${i + 1}-hub`, rodX(x0 - 2, x0 + t + 2, 62, 20).color(chromedSteel));
    // Painted ring on the outer face, as on competition bumpers.
    add(`${side}-plate-${i + 1}-ring`, torus(158, 3, 24).rotateY(90).translate(sx < 0 ? x0 : x0 + t, 0, AXIS_Z).color(plateAccent));
    x += t + 2;
  }
  if (PLATES.length > 0) {
    // Lock-jaw collar clamp outside the last plate, with its lever.
    const cx0 = x + 2;
    add(`${side}-clamp`, (sx < 0 ? rodX(-cx0 - 36, -cx0, 38, 16) : rodX(cx0, cx0 + 36, 38, 16)).color(plateAccent));
    add(`${side}-clamp-lever`, box(14, 16, 46, true).translate(sx * (cx0 + 18), 0, AXIS_Z + 56).color(knurlSteel));
  }
}

return p.model();
