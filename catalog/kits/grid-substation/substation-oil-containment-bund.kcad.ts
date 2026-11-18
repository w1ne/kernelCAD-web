// Oil containment bund: Low perimeter containment curb with internal drain sump and grated center panels. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-oil-containment-bund",
  license: "CC0-1.0",
  title: "Oil containment bund",
  description: "Low perimeter containment curb with internal drain sump and grated center panels. Material controls: concrete, stainless steel; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#88887f', stainlessSteel: '#9da4a0' },
  maintenance: { concrete: '#c1b46a' },
});
const p = assembly("substation-oil-containment-bund");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("base-slab", beveledPlate(7200, 5200, 180, 312).translate(0, 0, 0).scale(scale).color(concrete));
p.part("curb-front", box(7200, 190, 470, true).translate(0, -2505, 415).scale(scale).color(concrete));
p.part("curb-back", box(7200, 190, 470, true).translate(0, 2505, 415).scale(scale).color(concrete));
p.part("curb-left", box(190, 5200, 470, true).translate(-3505, 0, 415).scale(scale).color(concrete));
p.part("curb-right", box(190, 5200, 470, true).translate(3505, 0, 415).scale(scale).color(concrete));
p.part("drain-sump", box(900, 700, 160, true).translate(2700, 1950, 260).scale(scale).color(concrete));
p.part("grate-support-front", box(4200, 70, 40, true).translate(0, -1700, 200).scale(scale).color(stainlessSteel));
p.part("grate-support-back", box(4200, 70, 40, true).translate(0, 1700, 200).scale(scale).color(stainlessSteel));
for (let panel = 0; panel < 3; panel++) {
  const centerX = -1500 + panel * 1500;
  for (let bar = 0; bar < 14; bar++) {
    const x = centerX + (bar - 6.5) * 80;
    p.part(`grate-bar-${panel}-${bar}`, box(45, 3600, 25, true).translate(x, 0, 192.5).scale(scale).color(stainlessSteel));
  }
}

return p.model();
