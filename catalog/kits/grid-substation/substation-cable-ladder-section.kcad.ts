// Substation cable ladder section: Open cable ladder with twin stringers, evenly spaced rungs, and support feet. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-cable-ladder-section",
  license: "CC0-1.0",
  title: "Substation cable ladder section",
  description: "Open cable ladder with twin stringers, evenly spaced rungs, and support feet. Material controls: galvanized steel, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-cable-ladder-section");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("stringer-left", box(3000, 130, 500, true).translate(0, -281.25, 250).scale(scale).color(galvanizedSteel));
p.part("stringer-right", box(3000, 130, 500, true).translate(0, 281.25, 250).scale(scale).color(galvanizedSteel));
p.part("rung-1", box(95, 570, 90, true).translate(-1350, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-2", box(95, 570, 90, true).translate(-900, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-3", box(95, 570, 90, true).translate(-450, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-4", box(95, 570, 90, true).translate(0, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-5", box(95, 570, 90, true).translate(450, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-6", box(95, 570, 90, true).translate(900, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-7", box(95, 570, 90, true).translate(1350, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-8", box(95, 570, 90, true).translate(1800, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-9", box(95, 570, 90, true).translate(2250, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-10", box(95, 570, 90, true).translate(2700, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-11", box(95, 570, 90, true).translate(3150, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-12", box(95, 570, 90, true).translate(3600, 0, 205).scale(scale).color(stainlessSteel));
p.part("rung-13", box(95, 570, 90, true).translate(4050, 0, 205).scale(scale).color(stainlessSteel));
p.part("support-foot", beveledPlate(240, 285, 160, 14.40).translate(-975, 0, 0).scale(scale).color(stainlessSteel));
p.part("support-foot-2", beveledPlate(240, 285, 160, 14.40).translate(975, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
