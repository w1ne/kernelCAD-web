// Ground grid test well: Small inspection well with a removable cap and a visible ground riser. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-ground-grid-test-well",
  license: "CC0-1.0",
  title: "Ground grid test well",
  description: "Small inspection well with a removable cap and a visible ground riser. Material controls: concrete, stainless steel, copper; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { concrete: '#88887f', stainlessSteel: '#9da4a0', copper: '#9f704a' },
  maintenance: { concrete: '#c1b46a' },
});
const p = assembly("substation-ground-grid-test-well");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("inspection-box", beveledPlate(650, 650, 468, 39).translate(0, 0, 0).scale(scale).color(concrete));
p.part("cover-lid", box(728, 728, 100, true).translate(0, 0, 518).scale(scale).color(stainlessSteel));
p.part("ground-riser", cylinder(227.50, 75, 10).translate(0, 0, 468).scale(scale).color(copper));

return p.model();
