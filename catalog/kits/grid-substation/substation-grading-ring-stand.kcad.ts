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
p.part("support-neck", cylinder(360, 82, 10).translate(0, 0, 1606).scale(scale).color(porcelain));
for (let side = 0; side < 8; side++) {
  const angle = side * 45 + 22.5;
  const radians = (angle * Math.PI) / 180;
  const x = 314 * Math.cos(radians);
  const y = 314 * Math.sin(radians);
  p.part(`grading-ring-segment-${side}`, box(260, 70, 70, true).rotateZ(angle + 90).translate(x, y, 2000).scale(scale).color(copper));
}
p.part("terminal-pin", cylinder(220, 45, 8).translate(0, 0, 2032).scale(scale).color(copper));

return p.model();
