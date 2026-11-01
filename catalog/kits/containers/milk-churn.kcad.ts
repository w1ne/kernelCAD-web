// Original kernelCAD low-poly milk churn: a faceted steel drum with a
// conical shoulder, narrow neck and mushroom lid (ruled loft of polygon
// rings), rolled bands and two strap handles on the shoulder.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handles on +/-X.

meta({
  name: 'milk-churn',
  license: 'CC0-1.0',
  title: 'Milk churn',
  description: 'Steel dairy milk churn with conical shoulder, narrow neck, mushroom lid and two side handles, lidded or open. Knobs: size, lid, steel, band, lid and handle colours.',
  tags: ['milk churn', 'milk can', 'churn', 'dairy', 'farm', 'milk', 'can', 'rustic'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'farm', 'barn', 'dairy', 'rustic'],
  triangleBudget: 480,
});

const size = param('size', '40', { choices: ['20', '40'], label: 'Capacity (litres)' });
const lidOn = param('lid', 'on', { choices: ['on', 'off'], label: 'Lid' });
const steel = param('steel', '#b8c0c4', { label: 'Steel' });
const band = param('band', '#8a9296', { label: 'Bands' });
const lid = param('lidColor', '#a0a8ac', { label: 'Lid' });
const grip = param('grip', '#6e767c', { label: 'Handles' });

presets({
  painted: { steel: '#3f6a8a', band: '#2a3f52', lidColor: '#2a3f52', grip: '#2a2a2c' },
  rusty: { steel: '#8a6a52', band: '#5a3d2c', lidColor: '#7a5a42', grip: '#4a3226' },
  red: { steel: '#b2302a', band: '#d8d4c8', lidColor: '#d8d4c8', grip: '#2a2a2c' },
});

const s = Number(size.value) === 20 ? 0.8 : 1;
const n = 10;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const lathe = (rings: [number, number][]) =>
  ngon(rings[0][0] * s).loft(rings.slice(1).map(([r]) => ngon(r * s)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });

const R = 165;
const c = assembly('milk-churn');
// Body: drum, conical shoulder, neck and a flared mouth, with the mouth open.
c.part('body', lathe([[R, 0], [R, 420], [R * 0.95, 450], [95, 560], [90, 610], [108, 630]])
  .subtract(ngon(78 * s).extrude(100 * s).translate(0, 0, 580 * s)).color(steel));
// Rolled bands: a foot ring and a waist ring.
c.part('foot', ngon((R + 9) * s).extrude(40 * s).color(band));
c.part('waist', ngon((R + 7) * s).extrude(34 * s).translate(0, 0, 380 * s).color(band));

if (lidOn.value === 'on') {
  // Mushroom lid: a plug into the mouth, a domed cap and a knob.
  c.part('lid', lathe([[78, 590], [78, 630], [118, 632], [118, 650], [95, 690], [30, 705]])
    .union(ngon(22 * s).extrude(30 * s).translate(0, 0, 700 * s))
    .color(lid));
}

// Handles: flat bent straps riveted to the shoulder on each side.
const handle = (sx: number) => {
  // C-shaped strap (outer edge, then inner edge back); both ends sink into the shoulder.
  const loop: [number, number][] = [
    [100, 534], [194, 550], [208, 486], [136, 458],
    [134, 474], [192, 498], [182, 532], [104, 516],
  ];
  const pts = loop.map(([x, z]) => [x * s * sx, z * s] as [number, number]);
  const poly = sx > 0 ? pts : pts.reverse();
  return extrudePolygon(poly, 70 * s).rotateX(90).translate(0, 35 * s, 0);
};
c.part('handle-left', handle(-1).color(grip));
c.part('handle-right', handle(1).color(grip));

return c.model();
