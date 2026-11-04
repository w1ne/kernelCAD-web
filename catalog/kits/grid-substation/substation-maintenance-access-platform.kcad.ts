// Maintenance access platform: Raised service platform with guardrails, toe boards, and a short access stair. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "substation-maintenance-access-platform",
  license: "CC0-1.0",
  title: "Maintenance access platform",
  description: "Raised service platform with guardrails, toe boards, and a short access stair. Material controls: galvanized steel, safety yellow; finish presets: weathered and maintenance.",
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
presets({
  weathered: { galvanizedSteel: '#778080', safetyYellow: '#c6a23d' },
  maintenance: { safetyYellow: '#ffd64a' },
});
const p = assembly("substation-maintenance-access-platform");

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

p.part("deck", beveledPlate(2400, 1800, 180, 108).translate(0, 0, 1720).scale(scale).color(galvanizedSteel));
p.part("toe-board-front", box(2400, 100, 170, true).translate(0, -850, 1635).scale(scale).color(galvanizedSteel));
p.part("toe-board-back", box(2400, 100, 170, true).translate(0, 850, 1635).scale(scale).color(galvanizedSteel));
p.part("support-leg", box(150, 150, 1720, true).translate(-984, -702, 860).scale(scale).color(galvanizedSteel));
p.part("support-leg-2", box(150, 150, 1720, true).translate(-984, 702, 860).scale(scale).color(galvanizedSteel));
p.part("support-leg-3", box(150, 150, 1720, true).translate(984, -702, 860).scale(scale).color(galvanizedSteel));
p.part("support-leg-4", box(150, 150, 1720, true).translate(984, 702, 860).scale(scale).color(galvanizedSteel));
p.part("guardrail-post", box(110, 110, 988, true).translate(-984, 225, 2214).scale(scale).color(safetyYellow));
p.part("guardrail-post-2", box(110, 110, 988, true).translate(984, 225, 2214).scale(scale).color(safetyYellow));
p.part("top-rail", box(2400, 110, 110, true).translate(0, 225, 1655).scale(scale).color(safetyYellow));
p.part("mid-rail", box(2400, 90, 90, true).translate(0, 225, 1295).scale(scale).color(safetyYellow));
p.part("access-step", box(768, 576, 160, true).translate(-720, -180, 80).scale(scale).color(galvanizedSteel));

brace("deck-brace-left", [-984.00, 0, 494], [-456.00, 0, 1640], 85);
brace("deck-brace-right", [984.00, 0, 494], [456.00, 0, 1640], 85);

return p.model();
