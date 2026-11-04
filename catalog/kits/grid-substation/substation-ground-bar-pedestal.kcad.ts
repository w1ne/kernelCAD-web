// Ground bar pedestal: Insulated support stand carrying a long horizontal equipotential ground bar. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-ground-bar-pedestal",
  license: "CC0-1.0",
  title: "Ground bar pedestal",
  description: "Insulated support stand carrying a long horizontal equipotential ground bar. Material controls: galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
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
const p = assembly("substation-ground-bar-pedestal");

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

p.part("base", beveledPlate(1440, 620, 200, 37.20).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("insulating-support-left", loftedInsulator(667, 110, 10).translate(-496, 0, 200).scale(scale).color(porcelain));
p.part("insulating-support-right", loftedInsulator(667, 110, 10).translate(496, 0, 200).scale(scale).color(porcelain));
p.part("ground-bar", box(1600, 180, 180, true).translate(0, 0, 918).scale(scale).color(copper));
p.part("connection-pad-1", box(150, 280, 110, true).translate(-576, 0, 1044).scale(scale).color(copper));
p.part("connection-pad-2", box(150, 280, 110, true).translate(0, 0, 1044).scale(scale).color(copper));
p.part("connection-pad-3", box(150, 280, 110, true).translate(576, 0, 1044).scale(scale).color(copper));
p.part("connection-pad-4", box(150, 280, 110, true).translate(1152, 0, 1044).scale(scale).color(copper));
p.part("connection-pad-5", box(150, 280, 110, true).translate(1728, 0, 1044).scale(scale).color(copper));

return p.model();
