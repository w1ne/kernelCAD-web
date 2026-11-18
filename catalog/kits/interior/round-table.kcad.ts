// Original kernelCAD low-poly round dining table: a faceted round top with a
// thin apron on a turned pedestal with a cross foot, or on four legs.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'round-table',
  license: 'CC0-1.0',
  title: 'Round dining table',
  description: 'Round dining or cafe table with a faceted top on a pedestal with a cross foot or on four legs. Knobs: diameter, base style, top and base colours.',
  tags: ['round table', 'dining table', 'kitchen table', 'cafe table', 'pedestal table', 'table'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room', 'cafe'],
  triangleBudget: 400,
});

const diameter = param('diameter', '1100', { choices: ['800', '1100', '1400'], label: 'Diameter (mm)' });
const base = param('base', 'pedestal', { choices: ['pedestal', 'legs'], label: 'Base style' });
const top = param('top', '#b98a5a', { label: 'Top' });
const frame = param('frame', '#6b4a2f', { label: 'Base' });

presets({
  white: { top: '#f2f1ec', frame: '#c69c6d' },
  black: { top: '#2b2927', frame: '#2b2927' },
  oak: { top: '#d0a874', frame: '#d0a874' },
});

const R = Number(diameter.value) / 2;
const H = 750;
const tt = 32;
const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const t = assembly('round-table');
const sides = 12;
t.part('top', ngon(R - 12, sides).loft(ngon(R, sides), { spacing: tt, ruled: true }).translate(0, 0, H - tt).color(top));
t.part('apron', ngon(R * 0.72, sides).extrude(80).subtract(ngon(R * 0.72 - 22, sides).extrude(120).translate(0, 0, -20))
  .translate(0, 0, H - tt - 79).color(frame));
if (base.value === 'pedestal') {
  // Turned column: a bulb near the floor tapering up to the top.
  t.part('column', ngon(70, 8).loft([ngon(110, 8, Math.PI / 8), ngon(55, 8), ngon(75, 8, Math.PI / 8)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 70] },
      { plane: 'XY', origin: [0, 0, 220] },
      { plane: 'XY', origin: [0, 0, 560] },
      { plane: 'XY', origin: [0, 0, H - tt + 1] },
    ],
    ruled: true,
  }).color(frame));
  // Cross foot: two tapering bars, high at the centre and low at the toes.
  const footL = Math.min(R * 0.75, 420);
  const bar = () => extrudePolygon([[-footL, 0], [footL, 0], [footL, 40], [140, 90], [-140, 90], [-footL, 40]], 80).translate(0, 0, -40).rotateX(90);
  t.part('foot-a', bar().union(bar().rotateZ(90)).color(frame));
} else {
  const d = R * 0.62;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    const x = d * Math.cos(a);
    const y = d * Math.sin(a);
    const sq = (r: number) => path().moveTo(-r, -r).lineTo(r, -r).lineTo(r, r).lineTo(-r, r).close();
    t.part(`leg-${i + 1}`, sq(18).loft(sq(28), { spacing: H - tt + 1, ruled: true }).rotateZ((a * 180) / Math.PI).translate(x, y, 0).color(frame));
  }
}

return t.model();
