// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-ac-station-service-board",
  license: "CC0-1.0",
  title: "AC station service board",
  description: "Multi-bay station board with separate incoming and outgoing panel sections. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-ac-station-service-board");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [1900, 820, 220], [0, 0, 0]);
B("cabinet-body", [1748, 705.20, 1990], [0, 0, 220]);
B("rain-hood", [1976, 836.40, 140], [0, 0, 2210]);
B("front-panel-1", [351.12, 75, 1692], [-598.50, -360.80, 329.00]);
B("handle-1", [45, 75, 305.50], [-486.78, -385.40, 1057.50]);
B("front-panel-2", [351.12, 75, 1692], [-199.50, -360.80, 329.00]);
B("handle-2", [45, 75, 305.50], [-87.78, -385.40, 1057.50]);
B("front-panel-3", [351.12, 75, 1692], [199.50, -360.80, 329.00]);
B("handle-3", [45, 75, 305.50], [311.22, -385.40, 1057.50]);
B("front-panel-4", [351.12, 75, 1692], [598.50, -360.80, 329.00]);
B("handle-4", [45, 75, 305.50], [710.22, -385.40, 1057.50]);
B("cable-entry-plinth", [874, 262.40, 150], [0, 135.30, 0]);

return p.model();
