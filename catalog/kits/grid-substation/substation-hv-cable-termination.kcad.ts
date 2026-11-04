// High voltage cable termination: Cable termination pedestal with a stepped insulator body and flared top fitting. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-hv-cable-termination",
  license: "CC0-1.0",
  title: "High voltage cable termination",
  description: "Cable termination pedestal with a stepped insulator body and flared top fitting. Material controls: galvanized steel, cable jacket, porcelain, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const cableJacket = param('cableJacket', '#263d50', { label: 'Cable jacket' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { galvanizedSteel: '#778080', cableJacket: '#394852', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-hv-cable-termination");

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

p.part("base", beveledPlate(920, 920, 210, 55.20).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("cable-riser", cylinder(833, 147.20, 10).translate(0, 0, 210).scale(scale).color(cableJacket));
p.part("stress-cone-shed-1", loftedInsulator(100, 266.80, 10).translate(0, 0, 833).scale(scale).color(porcelain));
p.part("stress-cone-shed-2", loftedInsulator(100, 220.80, 10).translate(0, 0, 1029).scale(scale).color(porcelain));
p.part("stress-cone-shed-3", loftedInsulator(100, 266.80, 10).translate(0, 0, 1225).scale(scale).color(porcelain));
p.part("stress-cone-shed-4", loftedInsulator(100, 220.80, 10).translate(0, 0, 1421).scale(scale).color(porcelain));
p.part("stress-cone-shed-5", loftedInsulator(100, 266.80, 10).translate(0, 0, 1617).scale(scale).color(porcelain));
p.part("stress-cone-shed-6", loftedInsulator(100, 220.80, 10).translate(0, 0, 1813).scale(scale).color(porcelain));
p.part("terminal-pad", box(460, 441.60, 170, true).translate(0, 0, 2365).scale(scale).color(copper));
p.part("cable-clamp", box(386.40, 386.40, 180, true).translate(0, 0, 320).scale(scale).color(cableJacket));

return p.model();
