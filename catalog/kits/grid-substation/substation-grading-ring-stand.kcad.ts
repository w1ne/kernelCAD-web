// Grading ring stand: Tall grading ring and terminal support with a wide base and insulator stem. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-grading-ring-stand",
  license: "CC0-1.0",
  title: "Grading ring stand",
  description: "Tall grading ring and terminal support with a wide base and insulator stem. Material controls: galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-grading-ring-stand");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base", beveledPlate(986, 680, 220, 40.80).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("support", cylinder(1386, 105, 10).translate(0, 0, 220).scale(scale).color(porcelain));
p.part("ring-side-left", box(1450, 130, 130, true).translate(-217.50, 0, 1808).scale(scale).color(copper));
p.part("ring-side-right", box(1450, 130, 130, true).translate(217.50, 0, 1808).scale(scale).color(copper));
p.part("ring-top", box(899, 620, 130, true).translate(0, 0, 2018).scale(scale).color(copper));
p.part("terminal", box(230, 230, 170, true).translate(0, 0, 2015).scale(scale).color(copper));

return p.model();
