// Transformer oil conservator: Raised conservator vessel with saddles, end caps, and a level indicator box. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-conservator",
  license: "CC0-1.0",
  title: "Transformer oil conservator",
  description: "Raised conservator vessel with saddles, end caps, and a level indicator box. Material controls: galvanized steel, transformer enamel, glass, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const transformerEnamel = param('transformerEnamel', '#557052', { label: 'Transformer enamel' });
const glass = param('glass', '#4d929b', { label: 'Glass' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', transformerEnamel: '#5a6c53', glass: '#52888c', copper: '#9f704a' },
  maintenance: { transformerEnamel: '#9a7040' },
});
const p = assembly("substation-transformer-conservator");

p.part("saddle-left", box(390, 792, 594, true).translate(-702, 0, 297).scale(scale).color(galvanizedSteel));
p.part("saddle-right", box(390, 792, 594, true).translate(702, 0, 297).scale(scale).color(galvanizedSteel));
p.part("vessel-shell", cylinder(1872, 297, 10).rotateY(90).translate(-936, 0, 858).scale(scale).color(transformerEnamel));
p.part("end-cap-left", box(150, 715, 759, true).translate(-884, 0, 907.50).scale(scale).color(transformerEnamel));
p.part("end-cap-right", box(150, 715, 759, true).translate(884, 0, 907.50).scale(scale).color(transformerEnamel));
p.part("level-gauge", box(170, 120, 594, true).translate(598, 231, 1023).scale(scale).color(glass));
p.part("top-nozzle", box(220, 220, 250, true).translate(0, 0, 1525).scale(scale).color(copper));

return p.model();
