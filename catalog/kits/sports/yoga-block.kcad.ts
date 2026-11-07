// Yoga Block: Rectangular EVA yoga block with raised traction ribs across its broad support face. Low-poly sports prop in millimetres, Z up; materials: eva foam, textured grip foam.
meta({
  name: 'yoga-block',
  license: 'CC0-1.0',
  title: 'Yoga block',
  description: "Rectangular EVA yoga block with raised traction ribs across its broad support face. Material controls: eva foam, textured grip foam.",
  tags: ['yoga block', 'fitness', 'yoga', 'training', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const evaFoam = param('evaFoam', '#8c6b78', { label: 'EVA foam' });
const tractionFoam = param('tractionFoam', '#70535f', { label: 'Textured grip foam' });
presets({ clubColors: { evaFoam: '#587f75', tractionFoam: '#456a60' } });
const p = assembly('yoga-block');
p.part('block', box(180, 105, 65, true).translate(0, 0, 32.5).scale(scale).color(evaFoam));


// Shallow traction ribs break up the broad EVA support face.
for (let i = 0; i < 5; i++) p.part(`traction-rib-${i + 1}`, box(152, 3, 2, true).translate(0, -38 + i * 19, 65).color(tractionFoam));

return p.model();
