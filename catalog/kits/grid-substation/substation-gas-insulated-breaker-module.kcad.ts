// Gas insulated breaker module: Compact enclosed switching module with three short bushings and an operator cabinet. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-gas-insulated-breaker-module",
  license: "CC0-1.0",
  title: "Gas insulated breaker module",
  description: "Compact enclosed switching module with three short bushings and an operator cabinet. Material controls: galvanized steel, powder-coated steel, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const powderCoat = param('powderCoat', '#526f68', { label: 'Powder-coated steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', powderCoat: '#586b63', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { powderCoat: '#cf7736' },
});
const p = assembly("substation-gas-insulated-breaker-module");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const loftedInsulator = (height: number, radius: number, sides = 10) => {
  const levels = [0, .08, .18, .29, .40, .51, .62, .73, .84, .93, 1].map((v) => height * v);
  const radii = [.76, .98, .62, .96, .62, .96, .62, .96, .62, .95, .76].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);
const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("enclosure-base", beveledPlate(3300, 1300, 340, 78).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("sealed-enclosure", beveledPanel(2508, 1196, 936, 71.76).translate(0, 468, 340).scale(scale).color(powderCoat));
p.part("bushing-1", loftedInsulator(851, 125, 10).translate(-990, 0, 1679).scale(scale).color(porcelain));
p.part("terminal-1", box(230, 260, 170, true).translate(-990, 0, 2205).scale(scale).color(copper));
p.part("bushing-2", loftedInsulator(851, 125, 10).translate(0, 0, 1679).scale(scale).color(porcelain));
p.part("terminal-2", box(230, 260, 170, true).translate(0, 0, 2205).scale(scale).color(copper));
p.part("bushing-3", loftedInsulator(851, 125, 10).translate(990, 0, 1679).scale(scale).color(porcelain));
p.part("terminal-3", box(230, 260, 170, true).translate(990, 0, 2205).scale(scale).color(copper));
p.part("service-cabinet", beveledPanel(759, 1311, 442, 45.54).translate(693, 221, 340).scale(scale).color(powderCoat));

return p.model();
