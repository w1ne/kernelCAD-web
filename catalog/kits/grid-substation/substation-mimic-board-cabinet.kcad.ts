// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-mimic-board-cabinet",
  license: "CC0-1.0",
  title: "Mimic board cabinet",
  description: "Wide cabinet front with a framed blank mimic panel and service doors below. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-mimic-board-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [2200, 800, 220], [0, 0, 0]);
B("cabinet-body", [2024, 688, 1940], [0, 0, 220]);
B("rain-hood", [2288, 816, 140], [0, 0, 2160]);
B("front-panel-1", [406.56, 75, 1656], [-693, -352, 322.00]);
B("handle-1", [45, 75, 299], [-563.64, -376, 1035]);
B("front-panel-2", [406.56, 75, 1656], [-231, -352, 322.00]);
B("handle-2", [45, 75, 299], [-101.64, -376, 1035]);
B("front-panel-3", [406.56, 75, 1656], [231, -352, 322.00]);
B("handle-3", [45, 75, 299], [360.36, -376, 1035]);
B("front-panel-4", [406.56, 75, 1656], [693, -352, 322.00]);
B("handle-4", [45, 75, 299], [822.36, -376, 1035]);
B("cable-entry-plinth", [1012, 256, 150], [0, 132, 0]);

return p.model();
