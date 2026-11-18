// Aircraft wheel chocks: Paired triangular wheel chocks with connecting safety rope and broad ground contact. Low-poly scene geometry in millimetres, Z up.
meta({
  name: 'aircraft-wheel-chocks',
  license: 'CC0-1.0',
  title: 'Aircraft wheel chocks',
  description: 'Paired triangular wheel chocks with connecting safety rope and broad ground contact. Material controls: high-visibility paint, rope fabric. Appearance presets: weathered and high visibility.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyPaint = param('safetyPaint', '#e76f32', { label: 'High-visibility paint' });
const ropeFabric = param('ropeFabric', '#343a3d', { label: 'Rope fabric' });

presets({
  weathered: {
    safetyPaint: '#596765',
    ropeFabric: '#945b3c',
  },
  highVisibility: {
    safetyPaint: '#f0b52f',
    ropeFabric: '#262b2e',
  },
});
const p = assembly("aircraft-wheel-chocks");
p.part("left-chock", extrudePolygon([[-70, 0], [70, 0], [70, 48]], 42).rotate([1, 0, 0], 90).translate(0, -58, 0).scale(scale).color(safetyPaint));
p.part("right-chock", extrudePolygon([[-70, 0], [70, 0], [70, 48]], 42).rotate([1, 0, 0], 90).translate(0, 58, 0).scale(scale).color(safetyPaint));
p.part("safety-rope", cylinder(150, 5, 8).rotate([0, 1, 0], 90).translate(-75, 0, 18).scale(scale).color(ropeFabric));

return p.model();
