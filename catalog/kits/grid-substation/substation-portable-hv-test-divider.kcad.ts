// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-portable-hv-test-divider",
  license: "CC0-1.0",
  title: "Portable HV test divider",
  description: "Portable measurement divider on a tripod base with a stepped insulated column. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-portable-hv-test-divider");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("tripod-leg-1", [170, 264, 867.00], [-594, 0, 0]);
B("tripod-leg-2", [170, 264, 867.00], [594, 0, 0]);
B("tripod-hub", [1089, 792, 220], [0, 0, 714.00]);
C("divider-column", 1377, 264, [0, 0, 1173]);
C("divider-shed-1", 95, 511.50, [0, 0, 1275]);
C("divider-shed-2", 95, 511.50, [0, 0, 1458.60]);
C("divider-shed-3", 95, 511.50, [0, 0, 1642.20]);
C("divider-shed-4", 95, 511.50, [0, 0, 1825.80]);
C("divider-shed-5", 95, 511.50, [0, 0, 2009.40]);
C("divider-shed-6", 95, 511.50, [0, 0, 2193]);
B("top-terminal", [240, 240, 170], [0, 0, 2380]);

return p.model();
