// SPDX-License-Identifier: CC0-1.0
// Fixed-weight gym dumbbell lying on the floor: what makes it one is the
// short knurled chrome handle between two heavy rubber-coated heads — six-sided
// so it cannot roll off the rack, or round on a pro-style set — with chrome
// collars where the handle meets the heads and a weight disc on each end face.
// Generic visualization geometry at about real size (a 10 kg hex bell is about
// 330 mm long with 112 mm heads), millimetres, Z up, resting on z = 0.
meta({
  name: 'dumbbell',
  license: 'CC0-1.0',
  title: 'Dumbbell',
  description: "Fixed-weight gym dumbbell at about real size, lying on the floor: hexagonal or round rubber-coated heads, chrome collars, a contoured chrome handle with knurled grip bands and weight discs on the end faces. The weight choice (5-25 kg) sizes the heads; the head choice switches hex anti-roll heads for round pro-style ones. Material controls: rubber heads, chrome handle, knurl bands, weight disc; urethaneRed, proRound and weathered presets.",
  tags: ['dumbbell', 'hex dumbbell', 'free weights', 'gym', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const weight = param('weight', '10kg', { choices: ['5kg', '10kg', '15kg', '20kg', '25kg'], label: 'Weight' });
const head = param('head', 'hex', { choices: ['hex', 'round'], label: 'Head shape' });
const rubberWeight = param('rubberWeight', '#30363a', { label: 'Rubber heads' });
const knurledSteel = param('knurledSteel', '#c3cbcf', { label: 'Chrome handle' });
const knurlBand = param('knurlBand', '#848d92', { label: 'Knurled grip bands' });
const weightDisc = param('weightDisc', '#d8b13a', { label: 'Weight disc' });
presets({
  clubColors: { rubberWeight: '#496f83', weightDisc: '#f2efe6' },
  urethaneRed: { rubberWeight: '#a8302a', weightDisc: '#f2efe6', knurlBand: '#5f676b' },
  proRound: { head: 'round', rubberWeight: '#1f2224', weightDisc: '#c3cbcf' },
  weathered: { rubberWeight: '#4a4743', knurledSteel: '#8f9488', knurlBand: '#6a6a60', weightDisc: '#9b8442' },
});

const p = assembly('dumbbell');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[r, x], ...] revolved about the X axis (the handle axis).
const turnedX = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve().rotateY(90);
};

const kg = { '5kg': 5, '10kg': 10, '15kg': 15, '20kg': 20, '25kg': 25 }[weight.value];
const AF = 92 + 2 * kg;          // head size across flats
const T = 30 + 3.4 * kg;         // head thickness along the handle
const GRIP = 130;                // grip length between collars
const COLLAR = 12;
const AXIS_Z = AF / 2;           // flat of the hex (or the round rim) sits on the floor
const HR = 16.5;                 // handle radius (33 mm grip)

for (const sx of [-1, 1]) {
  const side = sx < 0 ? 'left' : 'right';
  const inner = GRIP / 2 + COLLAR;
  const x0 = sx < 0 ? -inner - T : inner;
  if (head.value === 'hex') {
    // Hex head: flats top and bottom so it sits still on the floor; chamfered outer edge.
    const hex = (af) => Array.from({ length: 6 }, (_, i) => {
      const a = ((30 + 60 * i) * Math.PI) / 180;
      return [(af / Math.sqrt(3)) * Math.cos(a), (af / Math.sqrt(3)) * Math.sin(a)];
    });
    add(`${side}-head`, extrudePolygon(hex(AF), T - 6).rotateY(90).translate(x0 + (sx < 0 ? 6 : 0), 0, AXIS_Z).color(rubberWeight));
    add(`${side}-head-chamfer`, extrudePolygon(hex(AF - 12), 6).rotateY(90).translate(sx < 0 ? x0 : x0 + T - 6, 0, AXIS_Z).color(rubberWeight));
  } else {
    // Round pro-style head: a fat drum with rounded shoulders.
    const R = AF / 2;
    const prof = [[0, 0], [R - 8, 0], [R, 8], [R, T - 8], [R - 8, T], [0, T]];
    add(`${side}-head`, turnedX(prof).translate(x0, 0, AXIS_Z).color(rubberWeight));
  }
  // Weight disc set into the outer face.
  const outer = sx < 0 ? -inner - T : inner + T;
  add(`${side}-weight-disc`, cylinder(3, AF * 0.3, 20).rotateY(90).translate(sx < 0 ? outer - 2 : outer - 1, 0, AXIS_Z).color(weightDisc));
  add(`${side}-end-bolt`, cylinder(4, 9, 6).rotateY(90).translate(sx < 0 ? outer - 5 : outer + 1, 0, AXIS_Z).color(knurledSteel));
  // Chrome collar flaring from the handle into the head.
  const cp = [[0, 0], [HR + 2, 0], [HR + 9, COLLAR - 3], [HR + 9, COLLAR], [0, COLLAR]];
  add(`${side}-collar`, turnedX(sx < 0 ? cp.map(([r, z]) => [r, -z]) : cp).translate(sx * (GRIP / 2), 0, AXIS_Z).color(knurledSteel));
}

// Contoured handle: slightly fatter in the middle of the grip.
add('handle', turnedX([[0, -GRIP / 2 - 2], [HR - 1, -GRIP / 2 - 2], [HR, -30], [HR + 0.6, 0], [HR, 30], [HR - 1, GRIP / 2 + 2], [0, GRIP / 2 + 2]]).translate(0, 0, AXIS_Z).color(knurledSteel));
// Two knurled bands either side of a smooth centre ring.
for (const [i, x] of [-30, 30].entries()) {
  add(`knurl-band-${i + 1}`, cylinder(46, HR + 1.2, 16).rotateY(90).translate(x - 23, 0, AXIS_Z).color(knurlBand));
}

return p.model();
