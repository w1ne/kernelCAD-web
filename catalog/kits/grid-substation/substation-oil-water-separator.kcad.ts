// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-oil-water-separator",
  license: "CC0-1.0",
  title: "Oil water separator",
  description: "Compact separator vessel with access covers, inlet manifold, and a sampling box. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-oil-water-separator");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("bund-base", [2700, 1600, 260], [0, 0, 0]);
B("vessel", [1944, 928.00, 972.00], [0, 0, 260]);
B("access-cover-left", [540, 480, 130], [-351, 0, 1350]);
B("access-cover-right", [540, 480, 130], [351, 0, 1350]);
B("inlet-pipe", [810, 180, 180], [-729, 0, 1026]);
B("outlet-pipe", [810, 180, 180], [729, 0, 1026]);
B("sampling-box", [540, 368, 594], [648, 288, 260]);

return p.model();
