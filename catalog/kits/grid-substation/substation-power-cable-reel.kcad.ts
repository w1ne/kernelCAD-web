// Power cable reel: Portable cable reel with flanged drums, axle supports, and a low transport frame. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-power-cable-reel",
  license: "CC0-1.0",
  title: "Power cable reel",
  description: "Portable cable reel with flanged drums, axle supports, and a low transport frame. Material controls: galvanized steel, rubber, cable jacket; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const rubber = param('rubber', '#293034', { label: 'Rubber' });
const cableJacket = param('cableJacket', '#263d50', { label: 'Cable jacket' });
presets({
  weathered: { galvanizedSteel: '#778080', rubber: '#3b3f3e', cableJacket: '#394852' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-power-cable-reel");

p.part("transport-chassis", box(1750, 684, 220, true).translate(0, 0, 110).scale(scale).color(galvanizedSteel));
p.part("reel-cheek", box(160, 950, 1254, true).translate(-490, 0, 847).scale(scale).color(galvanizedSteel));
p.part("reel-cheek-2", box(160, 950, 1254, true).translate(490, 0, 847).scale(scale).color(galvanizedSteel));
p.part("transport-wheel", cylinder(150, 170, 10).rotateX(90).translate(-332.50, -129.25, 170).scale(scale).color(rubber));
p.part("transport-wheel-2", cylinder(150, 170, 10).rotateX(90).translate(-332.50, 279.25, 170).scale(scale).color(rubber));
p.part("transport-wheel-3", cylinder(150, 170, 10).rotateX(90).translate(332.50, -129.25, 170).scale(scale).color(rubber));
p.part("transport-wheel-4", cylinder(150, 170, 10).rotateX(90).translate(332.50, 279.25, 170).scale(scale).color(rubber));
p.part("cable-drum", cylinder(1172.50, 445.50, 10).rotateY(90).translate(-586.25, 0, 1039.50).scale(scale).color(cableJacket));
p.part("axle", box(1190, 180, 180, true).translate(0, 0, 964.50).scale(scale).color(galvanizedSteel));

return p.model();
