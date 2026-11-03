// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-bay-control-cabinet",
  license: "CC0-1.0",
  title: "Bay control cabinet",
  description: "Outdoor bay control cabinet with paired doors and a raised sun hood. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-bay-control-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [1300, 950, 220], [0, 0, 0]);
B("cabinet-body", [1196, 817, 1940], [0, 0, 220]);
B("rain-hood", [1352, 969, 140], [0, 0, 2160]);
B("front-panel-1", [960.96, 75, 1656], [0, -418, 322.00]);
B("handle-1", [45, 75, 299], [305.76, -446.50, 1035]);
B("cable-entry-plinth", [598, 304, 150], [0, 156.75, 0]);

return p.model();
