// Precast cable trench section: Open-topped precast cable trench segment with reinforced sidewalls and end lips. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-precast-cable-trench",
  license: "CC0-1.0",
  title: "Precast cable trench section",
  description: "Open-topped precast cable trench segment with reinforced sidewalls and end lips. Material controls: concrete, cable jacket; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const cableJacket = param('cableJacket', '#263d50', { label: 'Cable jacket' });
presets({
  weathered: { concrete: '#88887f', cableJacket: '#394852' },
  maintenance: { concrete: '#c1b46a' },
});
const p = assembly("substation-precast-cable-trench");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);
const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);

p.part("trench-floor", beveledPlate(4200, 900, 180, 54).translate(0, 0, 0).scale(scale).color(concrete));
p.part("wall-left", beveledPanel(4200, 720, 170, 43.20).translate(0, -280, 180).scale(scale).color(concrete));
p.part("wall-right", beveledPanel(4200, 720, 170, 43.20).translate(0, 450, 180).scale(scale).color(concrete));
p.part("end-left", beveledPanel(170, 720, 900, 10.20).translate(-2015, 450, 180).scale(scale).color(concrete));
p.part("end-right", beveledPanel(170, 720, 900, 10.20).translate(2015, 450, 180).scale(scale).color(concrete));
p.part("cable-run-1", box(3528, 85, 85, true).translate(0, -247.50, 262.50).scale(scale).color(cableJacket));
p.part("cable-run-2", box(3528, 85, 85, true).translate(0, 49.50, 362.50).scale(scale).color(cableJacket));
p.part("cable-run-3", box(3528, 85, 85, true).translate(0, 346.50, 462.50).scale(scale).color(cableJacket));
p.part("cable-run-4", box(3528, 85, 85, true).translate(0, 643.50, 562.50).scale(scale).color(cableJacket));

return p.model();
