// Tubular busbar bridge: Raised busbar span with paired support columns and insulator stacks. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-tubular-busbar-bridge",
  license: "CC0-1.0",
  title: "Tubular busbar bridge",
  description: "Raised busbar span with paired support columns and insulator stacks. Material controls: concrete, galvanized steel, porcelain, copper; finish presets: weathered and maintenance.",
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
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { concrete: '#88887f', galvanizedSteel: '#778080', porcelain: '#cac4b1', copper: '#9f704a' },
  maintenance: { galvanizedSteel: '#e1b63d' },
});
const p = assembly("substation-tubular-busbar-bridge");

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

const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};

p.part("base-left", box(520, 720, 240, true).translate(-1610, 0, 120).scale(scale).color(concrete));
p.part("support-left", cylinder(1600, 95, 10).translate(-1610, 0, 240).scale(scale).color(galvanizedSteel));
p.part("insulator-left", loftedInsulator(420, 145, 10).translate(-1610, 0, 1840).scale(scale).color(porcelain));
p.part("base-right", box(520, 720, 240, true).translate(1610, 0, 120).scale(scale).color(concrete));
p.part("support-right", cylinder(1600, 95, 10).translate(1610, 0, 240).scale(scale).color(galvanizedSteel));
p.part("insulator-right", loftedInsulator(420, 145, 10).translate(1610, 0, 1840).scale(scale).color(porcelain));
p.part("bus-span", box(4600, 220, 220, true).translate(0, 0, 2150).scale(scale).color(copper));
p.part("terminal-left", box(260, 400, 220, true).translate(-2170, 0, 2110).scale(scale).color(copper));
p.part("terminal-right", box(260, 400, 220, true).translate(2170, 0, 2110).scale(scale).color(copper));

brace("bus-support-brace-left", [-1610, 0, 920], [-1012, 0, 1940], 80);
brace("bus-support-brace-right", [1610, 0, 920], [1012, 0, 1940], 80);

return p.model();
