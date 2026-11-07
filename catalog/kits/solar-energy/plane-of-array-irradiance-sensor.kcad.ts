meta({
  name: 'plane-of-array-irradiance-sensor',
  license: 'CC0-1.0',
  title: 'Plane-of-array irradiance sensor',
  description: 'Low sun-sensor head on an adjustable stand with a wide circular sensing plate.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#75817b', { label: 'Asset color' });
const p = assembly("plane-of-array-irradiance-sensor");
p.part("instrument-base", box(210, 210, 54, true).translate(0, 0, 27).scale(scale).color(color));
p.part("instrument-mast", cylinder(418.2, 24, 8).translate(0, 0, 54).scale(scale).color(color));
p.part("sensor-arm", box(336, 28, 26, true).translate(42, 0, 408).scale(scale).color(color));
p.part("sensor-disc", cylinder(40, 109.2, 8).translate(151.2, 0, 418.2).scale(scale).color(color));
p.part("sensor-cap", cylinder(18, 67.2, 8).translate(151.2, 0, 438.6).scale(scale).color(color));

return p.model();
