// Hockey Stick: Low-poly field hockey stick with a long shaft and hooked blade. Low-poly sports prop in millimetres, Z up; materials: composite shaft, blade tape, grip tape.
meta({
  name: 'hockey-stick',
  license: 'CC0-1.0',
  title: 'Field hockey stick',
  description: "Low-poly field hockey stick with a long shaft and hooked blade. Material controls: composite shaft, blade tape, grip tape.",
  tags: ['hockey stick', 'field hockey', 'stick', 'field sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const compositeShaft = param('compositeShaft', '#8a6844', { label: 'Composite shaft' });
const bladeTape = param('bladeTape', '#e7e0d0', { label: 'Blade tape' });
const gripTape = param('gripTape', '#30363a', { label: 'Grip tape' });
presets({ clubColors: { compositeShaft: '#344c68', bladeTape: '#d54c3e' } });
const p = assembly('hockey-stick');
p.part('shaft', box(18, 20, 620, true).translate(0, 0, 310).scale(scale).color(compositeShaft));
p.part('blade', box(112, 22, 22, true).translate(44, 0, 11).scale(scale).color(bladeTape));
p.part('heel', box(34, 22, 54, true).translate(6, 0, 38).scale(scale).color(bladeTape));


// Dark wrap bands mark the hand grip at the upper end of the composite shaft.
for (let i = 0; i < 4; i++) p.part(`grip-wrap-${i + 1}`, box(20, 22, 5, true).translate(0, 0, 538 + i * 18).color(gripTape));

return p.model();
