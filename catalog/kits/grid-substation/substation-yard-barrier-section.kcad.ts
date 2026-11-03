// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-yard-barrier-section",
  license: "CC0-1.0",
  title: "Yard barrier section",
  description: "Removable tubular barrier panel with two end feet and a high visibility rail silhouette. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-yard-barrier-section");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("lower-rail", [2600, 130, 130], [0, 0, 253]);
B("upper-rail", [2600, 150, 160], [0, 0, 782]);
B("upright-1", [120, 130, 713], [-1170, 0, 230]);
B("upright-2", [120, 130, 713], [-390, 0, 230]);
B("upright-3", [120, 130, 713], [390, 0, 230]);
B("upright-4", [120, 130, 713], [1170, 0, 230]);
B("foot", [420, 420, 150], [-1040, 0, 0]);
B("foot-2", [420, 420, 150], [1040, 0, 0]);

return p.model();
