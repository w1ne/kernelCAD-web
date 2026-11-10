// Substation cable ladder section: Open cable ladder with twin stringers, evenly spaced rungs, and support feet. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-cable-ladder-section",
  license: "CC0-1.0",
  title: "Substation cable ladder section",
  description: "Illustrative low-poly cable ladder with twin stringers, evenly spaced rungs, and mounting pads; not a fabrication model. Material controls: galvanized steel, stainless steel; finish presets: weathered and maintenance.",
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

p.part("stringer-left", box(3000, 40, 120, true).translate(0, -281.25, 60).scale(scale).color(galvanizedSteel));
p.part("stringer-right", box(3000, 40, 120, true).translate(0, 281.25, 60).scale(scale).color(galvanizedSteel));
// 13 rungs fit inside the 3000 mm stringers; the outer edges stop 122.5 mm short of each end.
for (let i = 0; i < 13; i++) {
  const x = -1350 + i * 225;
  p.part(`rung-${i + 1}`, box(55, 570, 30, true).translate(x, 0, 45).scale(scale).color(stainlessSteel));
}
for (const [xi, x] of [-975, 975].entries()) {
  for (const [yi, y] of [-281.25, 281.25].entries()) {
    p.part(`mounting-pad-${xi + 1}-${yi + 1}`, beveledPlate(220, 105, 12, 12).translate(x, y, -12).scale(scale).color(stainlessSteel));
  }
}

return p.model();
