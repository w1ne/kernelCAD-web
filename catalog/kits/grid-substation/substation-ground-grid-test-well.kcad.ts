// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-ground-grid-test-well",
  license: "CC0-1.0",
  title: "Ground grid test well",
  description: "Small inspection well with a removable cap and a visible ground riser. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-ground-grid-test-well");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("inspection-box", [650, 650, 468], [0, 0, 0]);
B("cover-lid", [728.00, 728.00, 100], [0, 0, 468]);
C("ground-riser", 227.50, 75, [0, 0, 468]);

return p.model();
