// Silica gel breather: Transparent-style breather vessel silhouette with neck, brackets, and base support. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-silica-gel-breather",
  license: "CC0-1.0",
  title: "Silica gel breather",
  description: "Transparent-style breather vessel silhouette with neck, brackets, and base support. Material controls: galvanized steel, glass, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const glass = param('glass', '#4d929b', { label: 'Glass' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { galvanizedSteel: '#778080', glass: '#52888c', stainlessSteel: '#9da4a0' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-silica-gel-breather");

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

p.part("mount-foot", box(620, 580, 170, true).translate(0, 0, 85).scale(scale).color(galvanizedSteel));
p.part("glass-vessel", taperedColumn(756, 161.20, 10).translate(0, 0, 170).scale(scale).color(glass));
p.part("neck", cylinder(243, 86.80, 10).translate(0, 0, 972).scale(scale).color(stainlessSteel));
p.part("top-cap", beveledPlate(297.60, 278.40, 140, 16.70).translate(0, 0, 1210).scale(scale).color(stainlessSteel));
p.part("mount-bracket", box(446.40, 130, 180, true).translate(0, 133.40, 441).scale(scale).color(galvanizedSteel));

return p.model();
