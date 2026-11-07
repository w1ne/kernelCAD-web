// Line trap: Hollow coil assembly suspended from a compact support frame above the bus. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-line-trap",
  license: "CC0-1.0",
  title: "Line trap",
  description: "Hollow coil assembly suspended from a compact support frame above the bus. Material controls: galvanized steel, copper, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', copper: '#9f704a', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-line-trap");

p.part("support-frame", box(1702, 684, 220, true).translate(0, 0, 110).scale(scale).color(galvanizedSteel));
p.part("end-support-left", box(180, 450, 1015, true).translate(-629, 0, 727.50).scale(scale).color(galvanizedSteel));
p.part("end-support-right", box(180, 450, 1015, true).translate(629, 0, 727.50).scale(scale).color(galvanizedSteel));
p.part("coil-turn-1", cylinder(899, 666, 10).rotateY(90).translate(-449.50, 0, 916).scale(scale).color(copper));
p.part("coil-turn-2", cylinder(899, 601.25, 10).rotateY(90).translate(-449.50, 0, 893.25).scale(scale).color(copper));
p.part("coil-turn-3", cylinder(899, 536.50, 10).rotateY(90).translate(-449.50, 0, 870.50).scale(scale).color(copper));
p.part("coil-turn-4", cylinder(899, 471.75, 10).rotateY(90).translate(-449.50, 0, 847.75).scale(scale).color(copper));
p.part("coil-turn-5", cylinder(899, 407, 10).rotateY(90).translate(-449.50, 0, 825).scale(scale).color(copper));
p.part("terminal-pad-left", box(300, 340, 150, true).translate(-758.50, 0, 1375).scale(scale).color(stainlessSteel));
p.part("terminal-pad-right", box(300, 340, 150, true).translate(758.50, 0, 1375).scale(scale).color(stainlessSteel));

return p.model();
