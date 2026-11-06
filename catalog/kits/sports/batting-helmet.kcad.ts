// Batting Helmet: Protective batting helmet prop with a domed shell, face brim and side guards. Low-poly sports prop in millimetres, Z up; materials: helmet shell polymer, impact foam, face guard steel.
meta({
  name: 'batting-helmet',
  license: 'CC0-1.0',
  title: 'Batting helmet',
  description: "Protective batting helmet prop with a domed shell, face brim and side guards. Material controls: helmet shell polymer, impact foam, face guard steel.",
  tags: ['batting helmet', 'helmet', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const helmetPolymer = param('helmetPolymer', '#4c6f9d', { label: 'Helmet shell polymer' });
const impactFoam = param('impactFoam', '#292e33', { label: 'Impact foam' });
const faceGuardSteel = param('faceGuardSteel', '#aab4b5', { label: 'Face guard steel' });
presets({ clubColors: { helmetPolymer: '#d74336', impactFoam: '#292e33' } });
const p = assembly('batting-helmet');
p.part('shell', sphere(72).scale([1.12, 1, 0.82]).translate(0, 0, 59.04).scale(scale).color(helmetPolymer));
p.part('brim', box(138, 100, 14, true).translate(20, -18, 7).scale(scale).color(helmetPolymer));
p.part('ear-guard-left', box(16, 38, 48, true).translate(-67, 0, 24).scale(scale).color(faceGuardSteel));
p.part('ear-guard-right', box(16, 38, 48, true).translate(67, 0, 24).scale(scale).color(faceGuardSteel));


// Two replaceable inner foam pads sit inside the protective shell at the temples.
p.part("left-temple-padding", box(22, 32, 11, true).translate(-42, -3, 37).color(impactFoam));
p.part("right-temple-padding", box(22, 32, 11, true).translate(42, -3, 37).color(impactFoam));

return p.model();
