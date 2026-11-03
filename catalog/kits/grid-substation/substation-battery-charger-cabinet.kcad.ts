// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-battery-charger-cabinet",
  license: "CC0-1.0",
  title: "Battery charger cabinet",
  description: "Floor standing charger enclosure with front service panels and lower air slots. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-battery-charger-cabinet");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [1050, 850, 220], [0, 0, 0]);
B("cabinet-body", [966, 731, 1690], [0, 0, 220]);
B("rain-hood", [1092, 867, 140], [0, 0, 1910]);
B("front-panel-1", [776.16, 75, 1476], [0, -374, 287]);
B("handle-1", [45, 75, 266.50], [246.96, -399.50, 922.50]);
B("vent-1", [577.50, 70, 38], [0, -391, 615]);
B("vent-2", [577.50, 70, 38], [0, -391, 687]);
B("vent-3", [577.50, 70, 38], [0, -391, 759]);
B("vent-4", [577.50, 70, 38], [0, -391, 831]);
B("vent-5", [577.50, 70, 38], [0, -391, 903]);
B("cable-entry-plinth", [483, 272, 150], [0, 140.25, 0]);

return p.model();
