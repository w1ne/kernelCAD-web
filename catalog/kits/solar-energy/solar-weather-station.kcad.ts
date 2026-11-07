meta({
  name: 'solar-weather-station',
  license: 'CC0-1.0',
  title: 'Solar weather station',
  description: 'Compact instrument mast with a crossarm, sensor housings and wind vane.',
  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#687d7f', { label: 'Asset color' });
const p = assembly("solar-weather-station");
p.part("instrument-base", box(280, 250, 54, true).translate(0, 0, 27).scale(scale).color(color));
p.part("instrument-mast", cylinder(1082.4, 24, 8).translate(0, 0, 54).scale(scale).color(color));
p.part("weather-crossarm", box(504, 24, 24, true).translate(0, 0, 1056).scale(scale).color(color));
p.part("sensor-pod-0", box(100, 100, 100, true).translate(-190.4, 0, 1135.2).scale(scale).color(color));
p.part("sensor-pod-1", box(100, 100, 100, true).translate(0, 0, 1135.2).scale(scale).color(color));
p.part("sensor-pod-2", box(100, 100, 100, true).translate(190.4, 0, 1135.2).scale(scale).color(color));
p.part("wind-vane-fin", box(220, 26, 70, true).translate(0, -150, 1267.2).scale(scale).color(color));

return p.model();
