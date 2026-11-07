// Baseball Glove: Open mitt-shaped glove prop with a broad palm, wrist cuff and raised finger pads. Low-poly sports prop in millimetres, Z up; materials: glove leather, palm lining, lace cord.
meta({
  name: 'baseball-glove',
  license: 'CC0-1.0',
  title: 'Baseball glove',
  description: "Open mitt-shaped glove prop with a broad palm, wrist cuff and raised finger pads. Material controls: glove leather, palm lining, lace cord.",
  tags: ['baseball glove', 'mitt', 'baseball', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const gloveLeather = param('gloveLeather', '#9a5938', { label: 'Glove leather' });
const palmLining = param('palmLining', '#6c4632', { label: 'Palm lining' });
const laceCord = param('laceCord', '#ddb987', { label: 'Lace cord' });
presets({ clubColors: { gloveLeather: '#73503e', palmLining: '#6c4632' } });
const p = assembly('baseball-glove');
p.part('wrist-cuff', box(70, 62, 38, true).translate(0, 0, 19).scale(scale).color(gloveLeather));
p.part('palm', sphere(66).scale([1.12, 0.85, 0.58]).translate(0, 0, 86).scale(scale).color(palmLining));
p.part('finger-one', sphere(25).translate(-47, 0, 142).scale(scale).color(gloveLeather));
p.part('finger-two', sphere(25).translate(-16, 0, 153).scale(scale).color(gloveLeather));
p.part('finger-three', sphere(25).translate(16, 0, 153).scale(scale).color(gloveLeather));
p.part('finger-four', sphere(25).translate(47, 0, 142).scale(scale).color(gloveLeather));
p.part('thumb', sphere(29).scale([0.82, 0.82, 1.35]).translate(73, -4, 100).scale(scale).color(gloveLeather));


// Pale leather laces bridge the palm web and outer finger stalls.
for (let i = 0; i < 5; i++) p.part(`palm-web-lace-${i + 1}`, box(3.5, 3, 38, true).rotate([0, 1, 0], (i - 2) * 8).translate(-31 + i * 15.5, -48, 113).color(laceCord));

return p.model();
