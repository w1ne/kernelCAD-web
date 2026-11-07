// Strain insulator string: Suspended stack of insulator sheds with end fittings for a line termination scene. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-strain-insulator-string",
  license: "CC0-1.0",
  title: "Strain insulator string",
  description: "Suspended stack of insulator sheds with end fittings for a line termination scene. Material controls: stainless steel, porcelain; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
presets({
  weathered: { stainlessSteel: '#9da4a0', porcelain: '#cac4b1' },
  maintenance: { stainlessSteel: '#d08039' },
});
const p = assembly("substation-strain-insulator-string");

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

p.part("upper-clevis", cylinder(180, 129.60, 10).translate(0, 0, 1520).scale(scale).color(stainlessSteel));
p.part("shed-1", loftedInsulator(115, 172.80, 10).translate(0, 0, 170).scale(scale).color(porcelain));
p.part("shed-2", loftedInsulator(115, 144, 10).translate(0, 0, 338.57).scale(scale).color(porcelain));
p.part("shed-3", loftedInsulator(115, 172.80, 10).translate(0, 0, 507.14).scale(scale).color(porcelain));
p.part("shed-4", loftedInsulator(115, 144, 10).translate(0, 0, 675.71).scale(scale).color(porcelain));
p.part("shed-5", loftedInsulator(115, 172.80, 10).translate(0, 0, 844.29).scale(scale).color(porcelain));
p.part("shed-6", loftedInsulator(115, 144, 10).translate(0, 0, 1012.86).scale(scale).color(porcelain));
p.part("shed-7", loftedInsulator(115, 172.80, 10).translate(0, 0, 1181.43).scale(scale).color(porcelain));
p.part("lower-clevis", cylinder(190, 115.20, 10).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
