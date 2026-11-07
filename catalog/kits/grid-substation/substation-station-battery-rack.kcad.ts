// Station battery rack: Two-tier battery rack carrying a row of distinct battery cases. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-station-battery-rack",
  license: "CC0-1.0",
  title: "Station battery rack",
  description: "Two-tier battery rack carrying a row of distinct battery cases. Material controls: galvanized steel, stainless steel, insulating polymer; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const polymer = param('polymer', '#6f91a0', { label: 'Insulating polymer' });
presets({
  weathered: { galvanizedSteel: '#778080', stainlessSteel: '#9da4a0', polymer: '#6c838a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-station-battery-rack");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("rack-foot-left", box(150, 900, 200, true).translate(-936, 0, 100).scale(scale).color(galvanizedSteel));
p.part("rack-foot-right", box(150, 900, 200, true).translate(936, 0, 100).scale(scale).color(galvanizedSteel));
p.part("rack-post-left", box(120, 120, 1650, true).translate(-936, 0, 1025).scale(scale).color(galvanizedSteel));
p.part("rack-post-right", box(120, 120, 1650, true).translate(936, 0, 1025).scale(scale).color(galvanizedSteel));
p.part("shelf-1", beveledPlate(2400, 900, 110, 54).translate(0, 0, 260).scale(scale).color(stainlessSteel));
p.part("battery-1-1", box(312, 666, 499.50, true).translate(-984, 0, 619.75).scale(scale).color(polymer));
p.part("battery-1-2", box(312, 666, 499.50, true).translate(-590.40, 0, 619.75).scale(scale).color(polymer));
p.part("battery-1-3", box(312, 666, 499.50, true).translate(-196.80, 0, 619.75).scale(scale).color(polymer));
p.part("battery-1-4", box(312, 666, 499.50, true).translate(196.80, 0, 619.75).scale(scale).color(polymer));
p.part("battery-1-5", box(312, 666, 499.50, true).translate(590.40, 0, 619.75).scale(scale).color(polymer));
p.part("battery-1-6", box(312, 666, 499.50, true).translate(984, 0, 619.75).scale(scale).color(polymer));
p.part("shelf-2", beveledPlate(2400, 900, 110, 54).translate(0, 0, 1055.50).scale(scale).color(stainlessSteel));
p.part("battery-2-1", box(312, 666, 499.50, true).translate(-984, 0, 1415.25).scale(scale).color(polymer));
p.part("battery-2-2", box(312, 666, 499.50, true).translate(-590.40, 0, 1415.25).scale(scale).color(polymer));
p.part("battery-2-3", box(312, 666, 499.50, true).translate(-196.80, 0, 1415.25).scale(scale).color(polymer));
p.part("battery-2-4", box(312, 666, 499.50, true).translate(196.80, 0, 1415.25).scale(scale).color(polymer));
p.part("battery-2-5", box(312, 666, 499.50, true).translate(590.40, 0, 1415.25).scale(scale).color(polymer));
p.part("battery-2-6", box(312, 666, 499.50, true).translate(984, 0, 1415.25).scale(scale).color(polymer));

return p.model();
