// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-station-battery-rack",
  license: "CC0-1.0",
  title: "Station battery rack",
  description: "Two-tier battery rack carrying a row of distinct battery cases. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "protection and control"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-station-battery-rack");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("rack-foot-left", [150, 900, 200], [-936, 0, 0]);
B("rack-foot-right", [150, 900, 200], [936, 0, 0]);
B("rack-post-left", [120, 120, 1650], [-936, 0, 200]);
B("rack-post-right", [120, 120, 1650], [936, 0, 200]);
B("shelf-1", [2400, 900, 110], [0, 0, 260]);
B("battery-1-1", [312, 666, 499.50], [-984.00, 0, 370]);
B("battery-1-2", [312, 666, 499.50], [-590.40, 0, 370]);
B("battery-1-3", [312, 666, 499.50], [-196.80, 0, 370]);
B("battery-1-4", [312, 666, 499.50], [196.80, 0, 370]);
B("battery-1-5", [312, 666, 499.50], [590.40, 0, 370]);
B("battery-1-6", [312, 666, 499.50], [984.00, 0, 370]);
B("shelf-2", [2400, 900, 110], [0, 0, 1055.50]);
B("battery-2-1", [312, 666, 499.50], [-984.00, 0, 1165.50]);
B("battery-2-2", [312, 666, 499.50], [-590.40, 0, 1165.50]);
B("battery-2-3", [312, 666, 499.50], [-196.80, 0, 1165.50]);
B("battery-2-4", [312, 666, 499.50], [196.80, 0, 1165.50]);
B("battery-2-5", [312, 666, 499.50], [590.40, 0, 1165.50]);
B("battery-2-6", [312, 666, 499.50], [984.00, 0, 1165.50]);

return p.model();
