// Breaker service trolley: Low service trolley with hydraulic power pack, hose reel, and lifting handle. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-hydraulic-breaker-service-trolley",
  license: "CC0-1.0",
  title: "Breaker service trolley",
  description: "Low service trolley with hydraulic power pack, hose reel, and lifting handle. Material controls: powder-coated steel, rubber, stainless steel; finish presets: weathered and maintenance.",
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
presets({
  weathered: { powderCoat: '#586b63', rubber: '#3b3f3e', stainlessSteel: '#9da4a0' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-hydraulic-breaker-service-trolley");

p.part("cart-chassis", box(1900, 703, 220, true).translate(0, 0, 110).scale(scale).color(powderCoat));
p.part("caster", cylinder(237.50, 150, 10).rotateX(90).translate(-684, -223.25, 150).scale(scale).color(rubber));
p.part("caster-2", cylinder(237.50, 150, 10).rotateX(90).translate(-684, 460.75, 150).scale(scale).color(rubber));
p.part("caster-3", cylinder(237.50, 150, 10).rotateX(90).translate(684, -223.25, 150).scale(scale).color(rubber));
p.part("caster-4", cylinder(237.50, 150, 10).rotateX(90).translate(684, 460.75, 150).scale(scale).color(rubber));
p.part("hydraulic-unit", box(1102, 532, 575, true).translate(0, 0, 507.50).scale(scale).color(powderCoat));
p.part("oil-reservoir", cylinder(483, 228, 10).translate(323, 80.75, 220).scale(scale).color(powderCoat));
p.part("hose-reel", box(380, 237.50, 483, true).translate(-332.50, 0, 461.50).scale(scale).color(powderCoat));
p.part("push-handle-left", box(90, 100, 575, true).translate(-741, 142.50, 507.50).scale(scale).color(stainlessSteel));
p.part("push-handle-right", box(90, 100, 575, true).translate(741, 142.50, 507.50).scale(scale).color(stainlessSteel));
p.part("handle-crossbar", box(1368, 100, 100, true).translate(0, 142.50, 809).scale(scale).color(stainlessSteel));

return p.model();
