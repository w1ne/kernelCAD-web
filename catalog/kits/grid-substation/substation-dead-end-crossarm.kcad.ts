// Dead end crossarm support: Tall steel support with a broad termination crossarm and suspended insulator points. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-dead-end-crossarm",
  license: "CC0-1.0",
  title: "Dead end crossarm support",
  description: "Tall steel support with a broad termination crossarm and suspended insulator points. Material controls: concrete, galvanized steel, porcelain; finish presets: weathered and maintenance.",
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
const porcelain = param('porcelain', '#e6dfcb', { label: 'Porcelain' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080', porcelain: '#cac4b1' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-dead-end-crossarm");

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

const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};

p.part("base-plate", beveledPlate(1305, 770, 280, 46.20).translate(0, 0, 0).scale(scale).color(concrete));
p.part("support-pole", taperedColumn(5920, 174, 10).translate(0, 0, 280).scale(scale).color(galvanizedSteel));
p.part("termination-crossarm", box(2900, 300, 260, true).translate(0, 0, 5650).scale(scale).color(galvanizedSteel));
p.part("lower-brace", box(1798, 190, 180, true).translate(0, 0, 4910).scale(scale).color(galvanizedSteel));
p.part("hanging-insulator-1", loftedInsulator(700, 78, 10).translate(-1044, 0, 4820).scale(scale).color(porcelain));
p.part("hanging-insulator-2", loftedInsulator(700, 78, 10).translate(0, 0, 4820).scale(scale).color(porcelain));
p.part("hanging-insulator-3", loftedInsulator(700, 78, 10).translate(1044, 0, 4820).scale(scale).color(porcelain));

brace("crossarm-brace-left", [0, 0, 3844], [-986.00, 0, 5400], 105);
brace("crossarm-brace-right", [0, 0, 3844], [986.00, 0, 5400], 105);

return p.model();
