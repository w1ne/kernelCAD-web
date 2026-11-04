// Oil water separator: Compact separator vessel with access covers, inlet manifold, and a sampling box. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-oil-water-separator",
  license: "CC0-1.0",
  title: "Oil water separator",
  description: "Compact separator vessel with access covers, inlet manifold, and a sampling box. Material controls: concrete, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { concrete: '#88887f', copper: '#9f704a' },
  maintenance: { concrete: '#c1b46a' },
});
const p = assembly("substation-oil-water-separator");

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

p.part("bund-base", beveledPlate(2700, 1600, 260, 96).translate(0, 0, 0).scale(scale).color(concrete));
p.part("vessel", taperedColumn(972, 416, 10).translate(0, 0, 260).scale(scale).color(concrete));
p.part("access-cover-left", beveledPlate(540, 480, 130, 28.80).translate(-351, 0, 1350).scale(scale).color(concrete));
p.part("access-cover-right", beveledPlate(540, 480, 130, 28.80).translate(351, 0, 1350).scale(scale).color(concrete));
p.part("inlet-pipe", box(810, 180, 180, true).translate(-729, 0, 1116).scale(scale).color(copper));
p.part("outlet-pipe", box(810, 180, 180, true).translate(729, 0, 1116).scale(scale).color(copper));
p.part("sampling-box", box(540, 368, 594, true).translate(648, 288, 557).scale(scale).color(concrete));

return p.model();
