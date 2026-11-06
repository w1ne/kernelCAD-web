// Soccer Ball: Ivory faceted soccer ball with contrasting pentagonal panel patches distributed over the spherical cover. Low-poly sports prop in millimetres, Z up; materials: ball cover, panel polymer.
meta({
  name: 'soccer-ball',
  license: 'CC0-1.0',
  title: 'Soccer ball',
  description: "Ivory faceted soccer ball with contrasting pentagonal panel patches distributed over the spherical cover. Material controls: ball cover, panel polymer.",
  tags: ['soccer ball', 'football', 'ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ballCover = param('ballCover', '#ece8d6', { label: 'Ball cover' });
const panelPolymer = param('panelPolymer', '#272c30', { label: 'Panel polymer' });
presets({ clubColors: { ballCover: '#e8e4d8', panelPolymer: '#cf4939' } });
const p = assembly('soccer-ball');
p.part('ball', sphere(58).translate(0, 0, 58).scale(scale).color(ballCover));


// Raised pentagonal patches break up the ivory cover into a recognizable panel ball.
for (let i = 0; i < 5; i++) {
  const a = 2 * Math.PI * i / 5 + Math.PI / 10;
  const x = 24 * Math.cos(a), y = 24 * Math.sin(a);
  const z = 58 + Math.sqrt(58 * 58 - x * x - y * y) + 0.6;
  p.part(`pentagon-panel-${i + 1}`, sphere(8.8).scale([1, 1, 0.2]).translate(x, y, z).color(panelPolymer));
}

return p.model();
