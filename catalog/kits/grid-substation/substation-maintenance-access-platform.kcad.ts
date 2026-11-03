// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-maintenance-access-platform",
  license: "CC0-1.0",
  title: "Maintenance access platform",
  description: "Raised service platform with guardrails, toe boards, and a short access stair. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-maintenance-access-platform");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("deck", [2400, 1800, 180], [0, 0, 1720]);
B("toe-board-front", [2400, 100, 170], [0, -850, 1550]);
B("toe-board-back", [2400, 100, 170], [0, 850, 1550]);
B("support-leg", [150, 150, 1720], [-984.00, -702, 0]);
B("support-leg-2", [150, 150, 1720], [-984.00, 702, 0]);
B("support-leg-3", [150, 150, 1720], [984.00, -702, 0]);
B("support-leg-4", [150, 150, 1720], [984.00, 702, 0]);
B("guardrail-post", [110, 110, 988], [-984.00, 225, 1720]);
B("guardrail-post-2", [110, 110, 988], [984.00, 225, 1720]);
B("top-rail", [2400, 110, 110], [0, 225, 1600]);
B("mid-rail", [2400, 90, 90], [0, 225, 1250]);
B("access-step", [768, 576, 160], [-720, -180, 0]);

return p.model();
