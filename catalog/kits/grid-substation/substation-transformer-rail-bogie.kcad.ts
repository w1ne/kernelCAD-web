// Transformer rail bogie: Low transport bogie with twin rail shoes, crossmembers, and wheel housings. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-rail-bogie",
  license: "CC0-1.0",
  title: "Transformer rail bogie",
  description: "Low transport bogie with twin rail shoes, crossmembers, and wheel housings. Material controls: galvanized steel, rubber, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const rubber = param('rubber', '#293034', { label: 'Rubber' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', rubber: '#3b3f3e', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-transformer-rail-bogie");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("frame", box(3500, 972, 342, true).translate(0, 0, 532).scale(scale).color(galvanizedSteel));
p.part("crossmember-front", box(2800, 1620, 180, true).translate(0, -513, 375).scale(scale).color(galvanizedSteel));
p.part("crossmember-back", box(2800, 1620, 180, true).translate(0, 513, 375).scale(scale).color(galvanizedSteel));
p.part("rail-wheel", cylinder(260, 190, 10).rotateX(90).translate(-1085, -428, 190).scale(scale).color(rubber));
p.part("rail-wheel-2", cylinder(260, 190, 10).rotateX(90).translate(-1085, 688, 190).scale(scale).color(rubber));
p.part("rail-wheel-3", cylinder(260, 190, 10).rotateX(90).translate(1085, -428, 190).scale(scale).color(rubber));
p.part("rail-wheel-4", cylinder(260, 190, 10).rotateX(90).translate(1085, 688, 190).scale(scale).color(rubber));
p.part("rail-shoe", beveledPlate(3220, 220, 160, 13.20).translate(0, -630, 0).scale(scale).color(stainlessSteel));
p.part("rail-shoe-2", beveledPlate(3220, 220, 160, 13.20).translate(0, 630, 0).scale(scale).color(stainlessSteel));

return p.model();
