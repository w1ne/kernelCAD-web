// American Football: Elongated pebbled football with pointed ends, contrasting end stripes and raised cross-laces across the crown. Low-poly sports prop in millimetres, Z up; materials: pebbled leather, ivory lacing, end stripe paint.
meta({
  name: 'american-football',
  license: 'CC0-1.0',
  title: 'American football',
  description: "Elongated pebbled football with pointed ends, contrasting end stripes and raised cross-laces across the crown. Material controls: pebbled leather, ivory lacing, end stripe paint.",
  tags: ['american football', 'football', 'ball', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const pebbledLeather = param('pebbledLeather', '#98552f', { label: 'Pebbled leather' });
const ivoryLaces = param('ivoryLaces', '#efe8d6', { label: 'Ivory lacing' });
const endStripePaint = param('endStripePaint', '#e9e1d0', { label: 'End stripe paint' });
presets({ clubColors: { pebbledLeather: '#39759a', ivoryLaces: '#f4d247' } });
const p = assembly('american-football');
p.part('ball', sphere(48).scale([1.55, 0.82, 0.82]).translate(0, 0, 39.36).scale(scale).color(pebbledLeather));


// Raised white cross-laces sit on the upper crown of the oblong leather shell.
p.part("lace-bar", box(32, 3.4, 2.6, true).translate(0, 0, 77).color(ivoryLaces));
for (let i = 0; i < 5; i++) p.part(`lace-${i + 1}`, box(2.6, 14, 2.8, true).translate(0, -19 + i * 9.5, 77).color(ivoryLaces));
p.part("end-stripe-front", box(4, 44, 6, true).translate(-56, 0, 39.36).color(endStripePaint));
p.part("end-stripe-back", box(4, 44, 6, true).translate(56, 0, 39.36).color(endStripePaint));

return p.model();
