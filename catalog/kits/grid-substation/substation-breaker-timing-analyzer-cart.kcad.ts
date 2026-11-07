// Breaker timing analyzer cart: Compact analyzer trolley with an upright recorder panel and coiled lead brackets. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-breaker-timing-analyzer-cart",
  license: "CC0-1.0",
  title: "Breaker timing analyzer cart",
  description: "Compact analyzer trolley with an upright recorder panel and coiled lead brackets. Material controls: powder-coated steel, rubber, stainless steel, glass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const rubber = param('rubber', '#293034', { label: 'Rubber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const glass = param('glass', '#4d929b', { label: 'Glass' });
presets({
  weathered: { powderCoat: '#586b63', rubber: '#3b3f3e', stainlessSteel: '#9da4a0', glass: '#52888c' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-breaker-timing-analyzer-cart");

p.part("cart-chassis", box(1250, 577.20, 220, true).translate(0, 0, 110).scale(scale).color(powderCoat));
p.part("caster", cylinder(195, 150, 10).rotateX(90).translate(-450, -183.30, 150).scale(scale).color(rubber));
p.part("caster-2", cylinder(195, 150, 10).rotateX(90).translate(-450, 378.30, 150).scale(scale).color(rubber));
p.part("caster-3", cylinder(195, 150, 10).rotateX(90).translate(450, -183.30, 150).scale(scale).color(rubber));
p.part("caster-4", cylinder(195, 150, 10).rotateX(90).translate(450, 378.30, 150).scale(scale).color(rubber));
p.part("instrument-case", box(850, 499.20, 690, true).translate(0, 0, 565).scale(scale).color(stainlessSteel));
p.part("analyzer-face", box(725, 90, 345, true).translate(0, -179.40, 1028.10).scale(scale).color(glass));
p.part("handle", box(725, 100, 100, true).translate(0, 97.50, 1330).scale(scale).color(stainlessSteel));
p.part("push-handle-left", box(90, 100, 690, true).translate(-487.50, 117, 565).scale(scale).color(stainlessSteel));
p.part("push-handle-right", box(90, 100, 690, true).translate(487.50, 117, 565).scale(scale).color(stainlessSteel));
p.part("handle-crossbar", box(900, 100, 100, true).translate(0, 117, 960.80).scale(scale).color(stainlessSteel));

return p.model();
