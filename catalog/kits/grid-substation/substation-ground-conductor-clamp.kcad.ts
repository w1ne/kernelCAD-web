// Ground conductor clamp: Bolt-on conductor clamp with a base plate, paired jaws, and crossbolt. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-ground-conductor-clamp",
  license: "CC0-1.0",
  title: "Ground conductor clamp",
  description: "Bolt-on conductor clamp with a base plate, paired jaws, and crossbolt. Material controls: galvanized steel, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', copper: '#9f704a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-ground-conductor-clamp");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base-plate", beveledPlate(560, 420, 90, 25.20).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("jaw-left", box(150, 252, 266, true).translate(-145.60, 0, 223).scale(scale).color(galvanizedSteel));
p.part("jaw-right", box(150, 252, 266, true).translate(145.60, 0, 223).scale(scale).color(galvanizedSteel));
p.part("crossbolt", box(448, 100, 100, true).translate(0, 0, 331.20).scale(scale).color(copper));
p.part("bolt-left", cylinder(190, 32, 10).translate(-145.60, 0, 90).scale(scale).color(copper));
p.part("bolt-right", cylinder(190, 32, 10).translate(145.60, 0, 90).scale(scale).color(copper));

return p.model();
