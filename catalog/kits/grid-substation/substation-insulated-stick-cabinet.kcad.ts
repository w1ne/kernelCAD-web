// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-insulated-stick-cabinet",
  license: "CC0-1.0",
  title: "Insulated operating stick cabinet",
  description: "Long wall mounted cabinet with separate bays for insulated operating sticks. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-insulated-stick-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("wall-back", [2850, 120, 650], [0, 94.50, 0]);
B("lower-shelf", [2850, 450, 150], [0, 0, 0]);
B("upper-shelf", [2850, 450, 150], [0, 0, 500]);
B("stick-bay-1", [95, 189, 442.00], [-1168.50, 0, 104]);
B("stick-bay-2", [95, 189, 442.00], [-778.05, 0, 104]);
B("stick-bay-3", [95, 189, 442.00], [-387.60, 0, 104]);
B("stick-bay-4", [95, 189, 442.00], [2.85, 0, 104]);
B("stick-bay-5", [95, 189, 442.00], [393.30, 0, 104]);
B("stick-bay-6", [95, 189, 442.00], [783.75, 0, 104]);
B("stick-bay-7", [95, 189, 442.00], [1174.20, 0, 104]);

return p.model();
