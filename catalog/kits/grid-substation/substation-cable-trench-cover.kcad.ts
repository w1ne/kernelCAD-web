// Cable trench cover module: Liftable trench cover slab with two recessed lifting slots and beveled edges. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-cable-trench-cover",
  license: "CC0-1.0",
  title: "Cable trench cover module",
  description: "Liftable trench cover slab with two recessed lifting slots and beveled edges. Material controls: concrete, stainless steel; finish presets: weathered and maintenance.",
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
presets({
  weathered: { concrete: '#88887f', stainlessSteel: '#9da4a0' },
  maintenance: { concrete: '#c1b46a' },
});
const p = assembly("substation-cable-trench-cover");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

p.part("cover-slab", beveledPlate(1200, 850, 150, 51).translate(0, 0, 0).scale(scale).color(concrete));
p.part("edge-rib-front", beveledPlate(1080, 75, 60, 4.50).translate(0, -348.50, 150).scale(scale).color(stainlessSteel));
p.part("edge-rib-back", beveledPlate(1080, 75, 60, 4.50).translate(0, 348.50, 150).scale(scale).color(stainlessSteel));
p.part("lifting-slot-lip", box(200, 130, 60, true).translate(-270, 0, 180).scale(scale).color(stainlessSteel));
p.part("lifting-slot-lip-2", box(200, 130, 60, true).translate(270, 0, 180).scale(scale).color(stainlessSteel));

return p.model();
