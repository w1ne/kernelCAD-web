// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-fiber-communications-cabinet",
  license: "CC0-1.0",
  title: "Fiber communications cabinet",
  description: "Communications enclosure with split equipment bays and overhead cable tray. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-fiber-communications-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [1050, 820, 220], [0, 0, 0]);
B("cabinet-body", [966, 705.20, 1790], [0, 0, 220]);
B("rain-hood", [1092, 836.40, 140], [0, 0, 2010]);
B("front-panel-1", [776.16, 75, 1548], [0, -360.80, 301.00]);
B("handle-1", [45, 75, 279.50], [246.96, -385.40, 967.50]);
B("vent-1", [577.50, 70, 38], [0, -377.20, 645]);
B("vent-2", [577.50, 70, 38], [0, -377.20, 717]);
B("vent-3", [577.50, 70, 38], [0, -377.20, 789]);
B("vent-4", [577.50, 70, 38], [0, -377.20, 861]);
B("vent-5", [577.50, 70, 38], [0, -377.20, 933]);
B("cable-entry-plinth", [483, 262.40, 150], [0, 135.30, 0]);

return p.model();
