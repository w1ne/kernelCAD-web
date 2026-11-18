// Transformer radiator bank: Fin bank with header rails and end manifolds for a transformer cooling scene. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-transformer-radiator-bank",
  license: "CC0-1.0",
  title: "Transformer radiator bank",
  description: "Fin bank with header rails and end manifolds for a transformer cooling scene. Material controls: transformer enamel, stainless steel, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const transformerEnamel = param('transformerEnamel', '#557052', { label: 'Transformer enamel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { transformerEnamel: '#5a6c53', stainlessSteel: '#9da4a0', copper: '#9f704a' },
  maintenance: { transformerEnamel: '#9a7040' },
});
const p = assembly("substation-transformer-radiator-bank");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("lower-header", beveledPlate(2400, 450, 180, 27).translate(0, 0, 0).scale(scale).color(transformerEnamel));
p.part("upper-header", beveledPlate(2400, 450, 180, 27).translate(0, 2270, 0).scale(scale).color(transformerEnamel));
p.part("radiator-fin-1", box(95, 612, 2090, true).translate(-1056, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-2", box(95, 612, 2090, true).translate(-633.60, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-3", box(95, 612, 2090, true).translate(-211.20, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-4", box(95, 612, 2090, true).translate(211.20, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-5", box(95, 612, 2090, true).translate(633.60, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-6", box(95, 612, 2090, true).translate(1056, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-7", box(95, 612, 2090, true).translate(1478.40, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-8", box(95, 612, 2090, true).translate(1900.80, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-9", box(95, 612, 2090, true).translate(2323.20, 0, 1225).scale(scale).color(stainlessSteel));
p.part("radiator-fin-10", box(95, 612, 2090, true).translate(2745.60, 0, 1225).scale(scale).color(stainlessSteel));
p.part("inlet-manifold", box(220, 225, 1837.50, true).translate(-1090, 0, 1098.75).scale(scale).color(copper));
p.part("outlet-manifold", box(220, 225, 1837.50, true).translate(1090, 0, 1098.75).scale(scale).color(copper));

return p.model();
