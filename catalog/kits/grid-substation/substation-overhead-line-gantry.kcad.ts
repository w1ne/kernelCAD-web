// Overhead line gantry: Portal frame carrying the incoming line conductors above a utility substation bay. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-overhead-line-gantry",
  license: "CC0-1.0",
  title: "Overhead line gantry",
  description: "Portal frame carrying the incoming line conductors above a utility substation bay. Material controls: concrete, galvanized steel, porcelain; finish presets: weathered and maintenance.",
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
const p = assembly("substation-overhead-line-gantry");

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

p.part("foot-left", beveledPlate(560, 620, 320, 33.60).translate(-2380, -620, 0).scale(scale).color(concrete));
p.part("foot-right", beveledPlate(560, 620, 320, 33.60).translate(2380, -620, 0).scale(scale).color(concrete));
p.part("column-left", box(308, 308, 6500, true).translate(-2380, -620, 3570).scale(scale).color(galvanizedSteel));
p.part("column-right", box(308, 308, 6500, true).translate(2380, -620, 3570).scale(scale).color(galvanizedSteel));
p.part("top-crossbeam", box(5600, 324, 320, true).translate(0, 0, 6980).scale(scale).color(galvanizedSteel));
p.part("cantilever-left", box(616, 220, 180, true).translate(-2492, 0, 6370).scale(scale).color(galvanizedSteel));
p.part("cantilever-right", box(616, 220, 180, true).translate(2492, 0, 6370).scale(scale).color(galvanizedSteel));
p.part("insulator-1", loftedInsulator(440, 85, 10).translate(-1624, 0, 5840).scale(scale).color(porcelain));
p.part("insulator-2", loftedInsulator(440, 85, 10).translate(-560, 0, 5840).scale(scale).color(porcelain));
p.part("insulator-3", loftedInsulator(440, 85, 10).translate(560, 0, 5840).scale(scale).color(porcelain));
p.part("insulator-4", loftedInsulator(440, 85, 10).translate(1624, 0, 5840).scale(scale).color(porcelain));
p.part("earthing-platform", box(3248, 630, 120, true).translate(0, 342, 6570).scale(scale).color(galvanizedSteel));

brace("knee-brace-left", [-2380, -620, 1450], [-1600, -620, 6690], 150);
brace("knee-brace-right", [2380, -620, 1450], [1600, -620, 6690], 150);

return p.model();
