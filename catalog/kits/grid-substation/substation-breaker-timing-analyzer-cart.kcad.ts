// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-breaker-timing-analyzer-cart",
  license: "CC0-1.0",
  title: "Breaker timing analyzer cart",
  description: "Compact analyzer trolley with an upright recorder panel and coiled lead brackets. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-breaker-timing-analyzer-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};

B("cart-chassis", [1250, 577.20, 220], [0, 0, 0]);
CY("caster", 195, 150, [-450, -280.80, 0]);
CY("caster-2", 195, 150, [-450, 280.80, 0]);
CY("caster-3", 195, 150, [450, -280.80, 0]);
CY("caster-4", 195, 150, [450, 280.80, 0]);
B("instrument-case", [850.00, 499.20, 690], [0, 0, 220]);
B("analyzer-face", [725, 90, 345], [0, -179.40, 855.60]);
B("handle", [725, 100, 100], [0, 97.50, 1280]);
B("push-handle-left", [90, 100, 690], [-487.50, 117, 220]);
B("push-handle-right", [90, 100, 690], [487.50, 117, 220]);
B("handle-crossbar", [900, 100, 100], [0, 117, 910.80]);

return p.model();
