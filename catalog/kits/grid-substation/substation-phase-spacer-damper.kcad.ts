// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-phase-spacer-damper",
  license: "CC0-1.0",
  title: "Phase spacer damper",
  description: "Cross-shaped spacer assembly for a bundled conductor scene. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "incoming lines and structures"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-phase-spacer-damper");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("lower-conductor-support", [1444, 180, 120], [0, 0, 0]);
B("cross-core", [1368, 180, 180], [0, 0, 294]);
B("arm-left", [684, 420, 200], [-408.50, 0, 224]);
B("arm-right", [684, 420, 200], [408.50, 0, 224]);
C("conductor-sleeve-1", 210, 115, [-446.50, 0, 385.00]);
C("conductor-sleeve-2", 210, 115, [446.50, 0, 385.00]);

return p.model();
