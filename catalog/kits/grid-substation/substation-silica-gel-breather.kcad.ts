// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-silica-gel-breather",
  license: "CC0-1.0",
  title: "Silica gel breather",
  description: "Transparent-style breather vessel silhouette with neck, brackets, and base support. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-silica-gel-breather");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("mount-foot", [620, 580, 170], [0, 0, 0]);
C("glass-vessel", 756.00, 161.20, [0, 0, 170]);
C("neck", 243, 86.80, [0, 0, 972]);
B("top-cap", [297.60, 278.40, 140], [0, 0, 1210]);
B("mount-bracket", [446.40, 130, 180], [0, 133.40, 351]);

return p.model();
