// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-cable-riser-frame",
  license: "CC0-1.0",
  title: "Cable riser frame",
  description: "Open steel frame supporting several vertical cable risers at a bay edge. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-cable-riser-frame");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("foot-left", [420, 936, 220], [-540, 0, 0]);
B("upright-left", [180, 180, 3280], [-540, 0, 220]);
B("foot-right", [420, 936, 220], [540, 0, 0]);
B("upright-right", [180, 180, 3280], [540, 0, 220]);
B("top-support", [1200, 220, 200], [0, 0, 3300]);
B("riser-1", [120, 150, 2170], [-300, 0, 220]);
B("riser-2", [120, 150, 2170], [-105.00, 0, 220]);
B("riser-3", [120, 150, 2170], [105.00, 0, 220]);
B("riser-4", [120, 150, 2170], [300, 0, 220]);

return p.model();
