// Surge arrester: Ribbed surge arrester column with a top terminal and a bolted pedestal. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-surge-arrester",
  license: "CC0-1.0",
  title: "Surge arrester",
  description: "Ribbed surge arrester column with a top terminal and a bolted pedestal. Material controls: galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
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
const p = assembly("substation-surge-arrester");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("mounting-base", beveledPlate(600, 600, 180, 36).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("arrester-section-1", cylinder(252, 216, 10).translate(0, 0, 180).scale(scale).color(porcelain));
p.part("arrester-section-2", cylinder(252, 186, 10).translate(0, 0, 492).scale(scale).color(porcelain));
p.part("arrester-section-3", cylinder(252, 216, 10).translate(0, 0, 804).scale(scale).color(porcelain));
p.part("arrester-section-4", cylinder(252, 186, 10).translate(0, 0, 1116).scale(scale).color(porcelain));
p.part("arrester-section-5", cylinder(252, 216, 10).translate(0, 0, 1428).scale(scale).color(porcelain));
p.part("arrester-section-6", cylinder(252, 186, 10).translate(0, 0, 1740).scale(scale).color(porcelain));
p.part("top-terminal", box(252, 252, 170, true).translate(0, 0, 2315).scale(scale).color(copper));

return p.model();
