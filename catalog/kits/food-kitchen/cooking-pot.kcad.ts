// Original kernelCAD low-poly stock pot: a faceted hollow drum with a rolled
// rim, two loop handles and a domed lid with a knob, or open with soup inside.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handles on +/-X.

meta({
  name: 'cooking-pot',
  license: 'CC0-1.0',
  title: 'Cooking pot',
  description: 'Stock pot with rolled rim, two loop handles and a domed lid with knob, lidded or open and full of soup or empty. Knobs: size, lid and contents, pot, handle, lid and soup colours.',
  tags: ['cooking pot', 'stock pot', 'saucepan', 'pot', 'soup', 'cookware', 'kitchen', 'stew'],
  kit: 'food-kitchen',
  category: 'prop',
  origin: 'base',
  compat: ['kitchen', 'indoor', 'food', 'restaurant', 'tavern', 'camp'],
  triangleBudget: 420,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const state = param('state', 'lidded', { choices: ['lidded', 'soup', 'empty'], label: 'Lid and contents' });
const pot = param('pot', '#a9b0b5', { label: 'Pot' });
const grip = param('grip', '#2b2b2e', { label: 'Handles and knob' });
const lid = param('lidColor', '#bcc3c8', { label: 'Lid' });
const soup = param('soup', '#c9772b', { label: 'Soup' });

presets({
  copper: { pot: '#b8693a', lidColor: '#c87a48', grip: '#3a2a20' },
  enamel: { pot: '#c8302a', lidColor: '#c8302a', grip: '#f0ece2' },
  'cast-iron': { pot: '#2e3033', lidColor: '#3a3d40', grip: '#1c1c1e' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.3 : 1;
const R = 120 * s;
const H = 190 * s;
const n = 10;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
// Ruled loft through [radius, z] rings.
const lathe = (rings: [number, number][]) =>
  ngon(rings[0][0]).loft(rings.slice(1).map(([r]) => ngon(r)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const p = assembly('cooking-pot');
// Drum with a slightly tucked base and a proud rolled rim, hollowed from above.
p.part('body', lathe([[R - 8 * s, 0], [R, 14 * s], [R, H - 12 * s], [R + 7 * s, H - 6 * s], [R + 7 * s, H]])
  .subtract(ngon(R - 7 * s).extrude(H).translate(0, 0, 10 * s)).color(pot));

// Loop handles: a flat U-shaped strap riveted to each side under the rim.
const handle = (sx: number) => {
  const pts: [number, number][] = [
    [R - 12 * s, -48 * s], [R + 42 * s, -48 * s], [R + 42 * s, 48 * s], [R - 12 * s, 48 * s],
    [R - 12 * s, 32 * s], [R + 26 * s, 32 * s], [R + 26 * s, -32 * s], [R - 12 * s, -32 * s],
  ];
  const poly = pts.map(([x, y]) => [x * sx, y] as [number, number]);
  return extrudePolygon(sx > 0 ? poly : poly.reverse(), 14 * s).translate(0, 0, H - 52 * s);
};
p.part('handle-left', handle(-1).color(grip));
p.part('handle-right', handle(1).color(grip));

if (state.value === 'lidded') {
  // Domed lid resting on the rim, with a stubby knob.
  p.part('lid', lathe([[R + 5 * s, H], [R + 5 * s, H + 8 * s], [R * 0.62, H + 40 * s], [28 * s, H + 48 * s]]).color(lid));
  p.part('knob', lathe([[16 * s, H + 44 * s], [16 * s, H + 58 * s], [26 * s, H + 64 * s], [26 * s, H + 74 * s]]).color(grip));
} else if (state.value === 'soup') {
  p.part('soup', ngon(R - 7 * s).extrude(H * 0.72).translate(0, 0, 10 * s).color(soup));
}

return p.model();
