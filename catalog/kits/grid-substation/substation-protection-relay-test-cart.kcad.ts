// Protection relay test cart: Wheeled relay test cart with a control face, instrument shelf, and pull handle. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-protection-relay-test-cart",
  license: "CC0-1.0",
  title: "Protection relay test cart",
  description: "Wheeled relay test cart with a control face, instrument shelf, and pull handle. Material controls: powder-coated steel, rubber, stainless steel, glass; finish presets: weathered and maintenance.",
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
const p = assembly("substation-protection-relay-test-cart");

p.part("cart-chassis", box(1450, 629, 220, true).translate(0, 0, 110).scale(scale).color(powderCoat));
p.part("caster", cylinder(212.50, 150, 10).rotateX(90).translate(-522, -199.75, 150).scale(scale).color(rubber));
p.part("caster-2", cylinder(212.50, 150, 10).rotateX(90).translate(-522, 412.25, 150).scale(scale).color(rubber));
p.part("caster-3", cylinder(212.50, 150, 10).rotateX(90).translate(522, -199.75, 150).scale(scale).color(rubber));
p.part("caster-4", cylinder(212.50, 150, 10).rotateX(90).translate(522, 412.25, 150).scale(scale).color(rubber));
p.part("test-instrument", box(986, 493, 660, true).translate(0, 0, 550).scale(scale).color(stainlessSteel));
p.part("instrument-face", box(841, 90, 360, true).translate(0, -187, 1035).scale(scale).color(glass));
p.part("lead-bracket", box(246.50, 153, 720, true).translate(253.75, 136, 580).scale(scale).color(powderCoat));
p.part("push-handle-left", box(90, 100, 750, true).translate(-565.50, 127.50, 595).scale(scale).color(stainlessSteel));
p.part("push-handle-right", box(90, 100, 750, true).translate(565.50, 127.50, 595).scale(scale).color(stainlessSteel));
p.part("handle-crossbar", box(1044, 100, 100, true).translate(0, 127.50, 1040).scale(scale).color(stainlessSteel));

return p.model();
