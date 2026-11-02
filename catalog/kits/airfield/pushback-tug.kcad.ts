meta({
  name: 'pushback-tug',
  license: 'CC0-1.0',
  title: 'Pushback tug',
  description: 'Low-profile aircraft pushback tug with a broad wheelbase, raised cab and nose-wheel cradle.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#c27b44', { label: 'Asset color' });
const p = assembly("pushback-tug");
p.part("chassis", box(408, 246.4, 42, true).translate(0, 0, 49).scale(scale).color(color));
p.part("operator-cab", box(129.6, 229.6, 100.8, true).translate(115.2, 0, 129.4).scale(scale).color(color));
p.part("rear-body", box(177.6, 235.2, 75.6, true).translate(-110.4, 0, 112.8).scale(scale).color(color));
p.part("tow-bar", box(129.6, 18, 16, true).translate(-230.4, 0, 49).scale(scale).color(color));
p.part("nose-wheel-cradle", box(105.6, 173.6, 24, true).translate(230.4, 0, 74).scale(scale).color(color));
p.part("wheel-1-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-148.8, -129.6, 31).scale(scale).color(color));
p.part("wheel-1-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(-148.8, 161.6, 31).scale(scale).color(color));
p.part("wheel-2-left", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(148.8, -129.6, 31).scale(scale).color(color));
p.part("wheel-2-right", cylinder(16, 31, 8).rotate([1, 0, 0], 90).translate(148.8, 161.6, 31).scale(scale).color(color));

return p.model();
