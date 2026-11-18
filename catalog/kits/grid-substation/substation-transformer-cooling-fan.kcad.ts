// Transformer cooling fan unit: Fan and motor unit mounted in a protective frame for an oil cooler bank. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-cooling-fan",
  license: "CC0-1.0",
  title: "Transformer cooling fan unit",
  description: "Fan and motor unit mounted in a protective frame for an oil cooler bank. Material controls: galvanized steel, powder-coated steel, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#586b63', stainlessSteel: '#9da4a0' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-transformer-cooling-fan");

p.part("fan-skid", box(1300, 850, 220, true).translate(0, 0, 110).scale(scale).color(galvanizedSteel));
p.part("fan-guard", box(1118, 220, 1332, true).translate(0, -233.75, 886).scale(scale).color(galvanizedSteel));
p.part("fan-housing-1", cylinder(240, 246.50, 10).rotateX(90).translate(-364, -233.75, 777).scale(scale).color(powderCoat));
p.part("fan-motor-1", box(208, 357, 444, true).translate(-364, 106.25, 472).scale(scale).color(powderCoat));
p.part("fan-housing-2", cylinder(240, 246.50, 10).rotateX(90).translate(0, -233.75, 777).scale(scale).color(powderCoat));
p.part("fan-motor-2", box(208, 357, 444, true).translate(0, 106.25, 472).scale(scale).color(powderCoat));
p.part("fan-housing-3", cylinder(240, 246.50, 10).rotateX(90).translate(364, -233.75, 777).scale(scale).color(powderCoat));
p.part("fan-motor-3", box(208, 357, 444, true).translate(364, 106.25, 472).scale(scale).color(powderCoat));

for (let fan = 0; fan < 3; fan++) {
  const centerX = (fan - 1) * 364.00;
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * 120;
    const radians = angle * Math.PI / 180;
    const cx = centerX + Math.cos(radians) * 80.85;
    const cz = 777 - Math.sin(radians) * 80.85;
    p.part(`fan-blade-${fan + 1}-${blade + 1}`, box(145.53, 58, 66, true).rotateY(angle)
      .translate(cx, -587.50, cz).scale(scale).color(stainlessSteel));
  }
}

return p.model();
