// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-protection-relay-rack",
  license: "CC0-1.0",
  title: "Protection relay rack",
  description: "Open relay rack with four shelves and a row of modular relay units. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-protection-relay-rack");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("rack-base", [1200, 800, 180], [0, 0, 0]);
B("left-rail", [120, 120, 2070], [-468, 0, 180]);
B("right-rail", [120, 120, 2070], [468, 0, 180]);
B("shelf-1", [984.00, 800, 90], [0, 0, 260]);
B("relay-module-1", [660, 576, 160], [0, 0, 350]);
B("shelf-2", [984.00, 800, 90], [0, 0, 610]);
B("relay-module-2", [660, 576, 160], [0, 0, 700]);
B("shelf-3", [984.00, 800, 90], [0, 0, 960]);
B("relay-module-3", [660, 576, 160], [0, 0, 1050]);
B("shelf-4", [984.00, 800, 90], [0, 0, 1310]);
B("relay-module-4", [660, 576, 160], [0, 0, 1400]);
B("shelf-5", [984.00, 800, 90], [0, 0, 1660]);
B("relay-module-5", [660, 576, 160], [0, 0, 1750]);

return p.model();
