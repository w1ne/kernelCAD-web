// Skateboard: Low-poly skateboard deck with two trucks and four wheels. Low-poly sports prop in millimetres, Z up; materials: maple deck, truck aluminium, urethane wheels.
meta({
  name: 'skateboard',
  license: 'CC0-1.0',
  title: 'Skateboard',
  description: "Low-poly skateboard deck with two trucks and four wheels. Material controls: maple deck, truck aluminium, urethane wheels.",
  tags: ['skateboard', 'skateboarding', 'board sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const mapleDeck = param('mapleDeck', '#a75e3b', { label: 'Maple deck' });
const truckAluminium = param('truckAluminium', '#8d999d', { label: 'Truck aluminium' });
const urethaneWheel = param('urethaneWheel', '#34383b', { label: 'Urethane wheels' });
presets({ clubColors: { mapleDeck: '#527c9c', truckAluminium: '#8d999d' } });
const p = assembly('skateboard');
p.part('deck', box(310, 82, 18, true).translate(0, 0, 112).scale(scale).color(mapleDeck));
p.part('front-truck', box(74, 38, 18, true).translate(-96, 0, 73).scale(scale).color(truckAluminium));
p.part('rear-truck', box(74, 38, 18, true).translate(96, 0, 73).scale(scale).color(truckAluminium));
p.part('wheel-front-left', sphere(24).translate(-100, -48, 24).scale(scale).color(urethaneWheel));
p.part('wheel-front-right', sphere(24).translate(-100, 48, 24).scale(scale).color(urethaneWheel));
p.part('wheel-rear-left', sphere(24).translate(100, -48, 24).scale(scale).color(urethaneWheel));
p.part('wheel-rear-right', sphere(24).translate(100, 48, 24).scale(scale).color(urethaneWheel));

return p.model();
