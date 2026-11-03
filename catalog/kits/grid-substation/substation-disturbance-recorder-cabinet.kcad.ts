// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-disturbance-recorder-cabinet",
  license: "CC0-1.0",
  title: "Disturbance recorder cabinet",
  description: "Recorder cabinet with a recessed instrument bay and lower cable entry. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-disturbance-recorder-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [1150, 900, 220], [0, 0, 0]);
B("cabinet-body", [1058, 774, 1840], [0, 0, 220]);
B("rain-hood", [1196, 918, 140], [0, 0, 2060]);
B("front-panel-1", [425.04, 75, 1584], [-241.50, -396, 308.00]);
B("handle-1", [45, 75, 286], [-106.26, -423, 990]);
B("front-panel-2", [425.04, 75, 1584], [241.50, -396, 308.00]);
B("handle-2", [45, 75, 286], [376.74, -423, 990]);
B("cable-entry-plinth", [529, 288, 150], [0, 148.50, 0]);

return p.model();
