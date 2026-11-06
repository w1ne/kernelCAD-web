// Baseball: White faceted baseball with paired raised red seam lines tracing the familiar curved path. Low-poly sports prop in millimetres, Z up; materials: ball cover, red stitching.
meta({
  name: 'baseball',
  license: 'CC0-1.0',
  title: 'Baseball',
  description: "White faceted baseball with paired raised red seam lines tracing the familiar curved path. Material controls: ball cover, red stitching.",
  tags: ['baseball', 'ball', 'bat and ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const coverLeather = param('coverLeather', '#eee9dd', { label: 'Ball cover' });
const redStitching = param('redStitching', '#c73732', { label: 'Red stitching' });
presets({ clubColors: { coverLeather: '#f1eee5', redStitching: '#1e568c' } });
const p = assembly('baseball');
p.part('ball', sphere(34).translate(0, 0, 34).scale(scale).color(coverLeather));


// Paired continuous red seam cords curve around the pale leather ball.
p.part("red-seam-left", torus(33.7, 0.65, 12).rotateX(42).translate(0, 0, 34).color(redStitching));
p.part("red-seam-right", torus(33.7, 0.65, 12).rotateX(-42).translate(0, 0, 34).color(redStitching));

return p.model();
