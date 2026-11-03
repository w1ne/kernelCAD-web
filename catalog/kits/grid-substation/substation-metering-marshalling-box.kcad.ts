// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-metering-marshalling-box",
  license: "CC0-1.0",
  title: "Metering marshalling box",
  description: "Compact instrument junction enclosure with a rain hood and cable gland plate. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-metering-marshalling-box");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("plinth", [980, 760, 220], [0, 0, 0]);
B("cabinet-body", [901.60, 653.60, 1140], [0, 0, 220]);
B("rain-hood", [1019.20, 775.20, 140], [0, 0, 1360]);
B("front-panel-1", [724.42, 75, 1080], [0, -334.40, 210.00]);
B("handle-1", [45, 75, 195], [230.50, -357.20, 675]);
B("cable-entry-plinth", [450.80, 243.20, 150], [0, 125.40, 0]);

return p.model();
