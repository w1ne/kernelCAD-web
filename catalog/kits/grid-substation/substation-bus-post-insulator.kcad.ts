// Bus post insulator stack: Reinforced ribbed post stack with a broad top cap for a yard bus support. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-bus-post-insulator",
  license: "CC0-1.0",
  title: "Bus post insulator stack",
  description: "Reinforced ribbed post stack with a broad top cap for a yard bus support. Material controls: galvanized steel, porcelain, stainless steel; finish presets: weathered and maintenance.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#cac4b1', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-bus-post-insulator");

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

p.part("mounting-foot", box(520, 520, 160, true).translate(0, 0, 80).scale(scale).color(galvanizedSteel));
p.part("core", loftedInsulator(1200, 93.60, 10).translate(0, 0, 160).scale(scale).color(porcelain));
p.part("shed-1", loftedInsulator(90, 239.20, 10).translate(0, 0, 250).scale(scale).color(porcelain));
p.part("shed-2", loftedInsulator(90, 239.20, 10).translate(0, 0, 436).scale(scale).color(porcelain));
p.part("shed-3", loftedInsulator(90, 239.20, 10).translate(0, 0, 622).scale(scale).color(porcelain));
p.part("shed-4", loftedInsulator(90, 239.20, 10).translate(0, 0, 808).scale(scale).color(porcelain));
p.part("shed-5", loftedInsulator(90, 239.20, 10).translate(0, 0, 994).scale(scale).color(porcelain));
p.part("shed-6", loftedInsulator(90, 239.20, 10).translate(0, 0, 1180).scale(scale).color(porcelain));
p.part("top-cap", beveledPlate(322.40, 322.40, 145, 19.34).translate(0, 0, 1405).scale(scale).color(stainlessSteel));

return p.model();
