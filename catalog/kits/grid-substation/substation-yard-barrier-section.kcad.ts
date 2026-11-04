// Yard barrier section: Removable tubular barrier panel with two end feet and a high visibility rail silhouette. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-yard-barrier-section",
  license: "CC0-1.0",
  title: "Yard barrier section",
  description: "Removable tubular barrier panel with two end feet and a high visibility rail silhouette. Material controls: galvanized steel, safety yellow, concrete; finish presets: weathered and maintenance.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#7f8c92', { label: 'Galvanized steel' });
const safetyYellow = param('safetyYellow', '#efbd32', { label: 'Safety yellow' });
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
presets({
  weathered: { galvanizedSteel: '#778080', safetyYellow: '#c6a23d', concrete: '#88887f' },
  maintenance: { safetyYellow: '#ffd64a' },
});
const p = assembly("substation-yard-barrier-section");

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

p.part("lower-rail", box(2600, 130, 130, true).translate(0, 0, 318).scale(scale).color(galvanizedSteel));
p.part("upper-rail", box(2600, 150, 160, true).translate(0, 0, 862).scale(scale).color(safetyYellow));
p.part("upright-1", box(120, 130, 713, true).translate(-1170, 0, 586.50).scale(scale).color(galvanizedSteel));
p.part("upright-2", box(120, 130, 713, true).translate(-390, 0, 586.50).scale(scale).color(galvanizedSteel));
p.part("upright-3", box(120, 130, 713, true).translate(390, 0, 586.50).scale(scale).color(galvanizedSteel));
p.part("upright-4", box(120, 130, 713, true).translate(1170, 0, 586.50).scale(scale).color(galvanizedSteel));
p.part("foot", box(420, 420, 150, true).translate(-1040, 0, 75).scale(scale).color(concrete));
p.part("foot-2", beveledPlate(420, 420, 150, 25.20).translate(1040, 0, 0).scale(scale).color(galvanizedSteel));

brace("diagonal-safety-brace", [-780, 0, 264.50], [780, 0, 713], 70);

return p.model();
