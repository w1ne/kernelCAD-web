// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-protection-relay-test-cart",
  license: "CC0-1.0",
  title: "Protection relay test cart",
  description: "Wheeled relay test cart with a control face, instrument shelf, and pull handle. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-protection-relay-test-cart");

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

B("cart-chassis", [1450, 629, 220], [0, 0, 0]);
CY("caster", 212.50, 150, [-522, -306, 0]);
CY("caster-2", 212.50, 150, [-522, 306, 0]);
CY("caster-3", 212.50, 150, [522, -306, 0]);
CY("caster-4", 212.50, 150, [522, 306, 0]);
B("test-instrument", [986.00, 493.00, 660], [0, 0, 220]);
B("instrument-face", [841.00, 90, 360], [0, -187, 855.00]);
B("lead-bracket", [246.50, 153, 720], [253.75, 136, 220]);
B("push-handle-left", [90, 100, 750], [-565.50, 127.50, 220]);
B("push-handle-right", [90, 100, 750], [565.50, 127.50, 220]);
B("handle-crossbar", [1044, 100, 100], [0, 127.50, 990]);

return p.model();
