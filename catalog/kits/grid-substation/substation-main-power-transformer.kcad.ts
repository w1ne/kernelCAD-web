// Main power transformer: Large transformer tank with cooler banks, bushings, conservator, and transport base. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-main-power-transformer",
  license: "CC0-1.0",
  title: "Main power transformer",
  description: "Large transformer tank with cooler banks, bushings, conservator, and transport base. Material controls: stainless steel, transformer enamel, porcelain, rubber; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const transformerEnamel = param('transformerEnamel', '#557052', { label: 'Transformer enamel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const rubber = param('rubber', '#293034', { label: 'Rubber' });
presets({
  weathered: { stainlessSteel: '#9da4a0', transformerEnamel: '#5a6c53', porcelain: '#cac4b1', rubber: '#3b3f3e' },
  maintenance: { transformerEnamel: '#9a7040' },
});
const p = assembly("substation-main-power-transformer");

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

p.part("transport-base", beveledPlate(6400, 3276, 320, 196.56).translate(0, 0, 0).scale(scale).color(stainlessSteel));
p.part("main-tank", box(3968, 2574, 2916, true).translate(0, 0, 1778).scale(scale).color(transformerEnamel));
p.part("tank-cover", beveledPlate(4206.08, 2728.44, 180, 163.71).translate(0, 0, 3236).scale(scale).color(transformerEnamel));
p.part("cooler-fin-left-1", box(90, 90, 2274.48, true).translate(-2039, -1081.08, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-1", box(90, 90, 2274.48, true).translate(2039, -1081.08, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-2", box(90, 90, 2274.48, true).translate(-2039, -720.72, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-2", box(90, 90, 2274.48, true).translate(2039, -720.72, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-3", box(90, 90, 2274.48, true).translate(-2039, -360.36, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-3", box(90, 90, 2274.48, true).translate(2039, -360.36, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-4", box(90, 90, 2274.48, true).translate(-2039, 0, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-4", box(90, 90, 2274.48, true).translate(2039, 0, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-5", box(90, 90, 2274.48, true).translate(-2039, 360.36, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-5", box(90, 90, 2274.48, true).translate(2039, 360.36, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-6", box(90, 90, 2274.48, true).translate(-2039, 720.72, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-6", box(90, 90, 2274.48, true).translate(2039, 720.72, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-left-7", box(90, 90, 2274.48, true).translate(-2039, 1081.08, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-fin-right-7", box(90, 90, 2274.48, true).translate(2039, 1081.08, 1567.24).scale(scale).color(stainlessSteel));
p.part("cooler-header-lower-left", box(180, 2419.56, 150, true).translate(-2039, 0, 505).scale(scale).color(stainlessSteel));
p.part("cooler-header-upper-left", box(180, 2419.56, 150, true).translate(-2039, 0, 2779.48).scale(scale).color(stainlessSteel));
p.part("cooler-header-lower-right", box(180, 2419.56, 150, true).translate(2039, 0, 505).scale(scale).color(stainlessSteel));
p.part("cooler-header-upper-right", box(180, 2419.56, 150, true).translate(2039, 0, 2779.48).scale(scale).color(stainlessSteel));
p.part("conservator", cylinder(2460.16, 360.36, 10).rotateY(90).translate(-1230.08, -1235.52, 4428).scale(scale).color(transformerEnamel));
p.part("conservator-pipe", box(180, 411.84, 1512, true).translate(0, -900.90, 3996).scale(scale).color(stainlessSteel));
p.part("bushing-1", loftedInsulator(1296, 145, 10).translate(-1349.12, 308.88, 3416).scale(scale).color(porcelain));
p.part("bushing-2", loftedInsulator(1296, 145, 10).translate(-476.16, 308.88, 3416).scale(scale).color(porcelain));
p.part("bushing-3", loftedInsulator(1296, 145, 10).translate(396.80, 308.88, 3416).scale(scale).color(porcelain));
p.part("bushing-4", loftedInsulator(1296, 145, 10).translate(1269.76, 308.88, 3416).scale(scale).color(porcelain));
p.part("transport-wheel", cylinder(260, 205, 10).rotateX(90).translate(-1984, -1001, 205).scale(scale).color(rubber));
p.part("transport-wheel-2", cylinder(260, 205, 10).rotateX(90).translate(-1984, 1261, 205).scale(scale).color(rubber));
p.part("transport-wheel-3", cylinder(260, 205, 10).rotateX(90).translate(1984, -1001, 205).scale(scale).color(rubber));
p.part("transport-wheel-4", cylinder(260, 205, 10).rotateX(90).translate(1984, 1261, 205).scale(scale).color(rubber));

return p.model();
