// Cable riser frame: Open steel frame supporting several vertical cable risers at a bay edge. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-cable-riser-frame",
  license: "CC0-1.0",
  title: "Cable riser frame",
  description: "Open steel frame supporting several vertical cable risers at a bay edge. Material controls: concrete, galvanized steel, cable jacket; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const cableJacket = param('cableJacket', '#263d50', { label: 'Cable jacket' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080', cableJacket: '#394852' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-cable-riser-frame");

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};

p.part("foot-left", beveledPlate(420, 936, 220, 25.20).translate(-540, 0, 0).scale(scale).color(concrete));
p.part("upright-left", box(180, 180, 3280, true).translate(-540, 0, 1860).scale(scale).color(galvanizedSteel));
p.part("foot-right", beveledPlate(420, 936, 220, 25.20).translate(540, 0, 0).scale(scale).color(concrete));
p.part("upright-right", box(180, 180, 3280, true).translate(540, 0, 1860).scale(scale).color(galvanizedSteel));
p.part("top-support", box(1200, 220, 200, true).translate(0, 0, 3400).scale(scale).color(galvanizedSteel));
p.part("riser-1", box(120, 150, 2170, true).translate(-300, 0, 1305).scale(scale).color(cableJacket));
p.part("riser-2", box(120, 150, 2170, true).translate(-105, 0, 1305).scale(scale).color(cableJacket));
p.part("riser-3", box(120, 150, 2170, true).translate(105, 0, 1305).scale(scale).color(cableJacket));
p.part("riser-4", box(120, 150, 2170, true).translate(300, 0, 1305).scale(scale).color(cableJacket));

brace("cross-brace-a", [-540, 0, 220], [540, 0, 3180], 90);
brace("cross-brace-b", [540, 0, 220], [-540, 0, 3180], 90);

return p.model();
