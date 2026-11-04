// Yard light mast: Tall lighting mast with a projecting luminaire bracket and compact lamp housing. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-yard-light-mast",
  license: "CC0-1.0",
  title: "Yard light mast",
  description: "Tall lighting mast with a projecting luminaire bracket and compact lamp housing. Material controls: galvanized steel, stainless steel, glass; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const glass = param('glass', '#4d929b', { label: 'Glass' });
presets({
  weathered: { galvanizedSteel: '#778080', stainlessSteel: '#9da4a0', glass: '#52888c' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-yard-light-mast");

const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};
const taperedColumn = (height: number, radius: number, sides = 10) => {
  const profiles = [ngon(radius * 1.2, sides), ngon(radius * .72, sides)];
  return profiles[0].loft(profiles.slice(1), {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
      { plane: 'XY' as const, origin: [0, 0, height] as [number, number, number] }],
    ruled: true,
  });
};
const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base-plate", beveledPlate(800, 800, 300, 48).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("mast-pole", taperedColumn(6500, 115, 10).translate(0, 0, 300).scale(scale).color(galvanizedSteel));
p.part("outreach-arm", box(1160, 170, 160, true).translate(384, 0, 6260).scale(scale).color(stainlessSteel));
p.part("luminaire", box(576, 352, 220, true).translate(840, 0, 6070).scale(scale).color(glass));

return p.model();
