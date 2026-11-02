meta({
  name: 'terminal-gate-front',
  license: 'CC0-1.0',
  title: 'Terminal gate front',
  description: 'Terminal concourse facade with a wide gate opening, upper canopy and side service blocks.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#9b9d99', { label: 'Asset color' });
const p = assembly("terminal-gate-front");
p.part("left-pier", box(76, 74, 280, true).translate(-260, 0, 140).scale(scale).color(color));
p.part("right-pier", box(76, 74, 280, true).translate(260, 0, 140).scale(scale).color(color));
p.part("gate-canopy", box(620, 120, 48, true).translate(0, 0, 304).scale(scale).color(color));
p.part("concourse-roof", box(850, 420, 38, true).translate(0, -185, 332).scale(scale).color(color));
p.part("gate-apron", box(500, 150, 18, true).translate(0, 80, 10).scale(scale).color(color));

return p.model();
