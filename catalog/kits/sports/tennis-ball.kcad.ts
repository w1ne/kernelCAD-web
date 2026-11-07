// Tennis Ball: Compact felt tennis ball with a continuous curved ivory seam around its spherical surface. Low-poly sports prop in millimetres, Z up; materials: felt cover, seam tape.
meta({
  name: 'tennis-ball',
  license: 'CC0-1.0',
  title: 'Tennis ball',
  description: "Compact felt tennis ball with a continuous curved ivory seam around its spherical surface. Material controls: felt cover, seam tape.",
  tags: ['tennis ball', 'ball', 'tennis', 'court sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const feltCover = param('feltCover', '#b6c84c', { label: 'Felt cover' });
const seamTape = param('seamTape', '#f0ebdf', { label: 'Seam tape' });
presets({ clubColors: { feltCover: '#d9a63a', seamTape: '#f0ebdf' } });
const p = assembly('tennis-ball');
p.part('ball', sphere(34).translate(0, 0, 34).scale(scale).color(feltCover));


// A smooth continuous seam traces a curved band around the felt ball.
p.part("curved-seam", torus(33.8, 0.65, 12).rotateX(58).translate(0, 0, 34).color(seamTape));

return p.model();
