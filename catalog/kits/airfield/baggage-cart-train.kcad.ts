meta({
  name: 'baggage-cart-train',
  license: 'CC0-1.0',
  title: 'Baggage cart train',
  description: 'Apron tractor towing three low-sided baggage trailers with paired axles.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#a58b53', { label: 'Asset color' });
const p = assembly("baggage-cart-train");
p.part("chassis", box(357, 154, 42, true).translate(0, 0, 49).scale(scale).color(color));
p.part("tractor-cab", box(130.2, 148.75, 79.2, true).translate(96.6, 0, 112.6).scale(scale).color(color));
p.part("trailer-1-bed", box(142.8, 164.5, 36, true).translate(-84, 0, 37.53).scale(scale).color(color));
p.part("trailer-1-load", box(100.8, 136.5, 66, true).translate(-84, 0, 88.53).scale(scale).color(color));
p.part("trailer-1-left-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-84, -68.25, 19.53).scale(scale).color(color));
p.part("trailer-1-right-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-84, 96.25, 19.53).scale(scale).color(color));
p.part("trailer-2-bed", box(142.8, 164.5, 36, true).translate(-285.6, 0, 37.53).scale(scale).color(color));
p.part("trailer-2-load", box(100.8, 136.5, 66, true).translate(-285.6, 0, 88.53).scale(scale).color(color));
p.part("trailer-2-left-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-285.6, -68.25, 19.53).scale(scale).color(color));
p.part("trailer-2-right-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-285.6, 96.25, 19.53).scale(scale).color(color));
p.part("trailer-3-bed", box(142.8, 164.5, 36, true).translate(-487.2, 0, 37.53).scale(scale).color(color));
p.part("trailer-3-load", box(100.8, 136.5, 66, true).translate(-487.2, 0, 88.53).scale(scale).color(color));
p.part("trailer-3-left-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-487.2, -68.25, 19.53).scale(scale).color(color));
p.part("trailer-3-right-wheel", cylinder(14, 19.53, 8).rotate([1, 0, 0], 90).translate(-487.2, 96.25, 19.53).scale(scale).color(color));

return p.model();
