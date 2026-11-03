// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-transformer-oil-sampling-station",
  license: "CC0-1.0",
  title: "Transformer oil sampling station",
  description: "Small sampling cabinet with bottle shelf, drain tray, and pipe connection points. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-transformer-oil-sampling-station");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("cabinet-base", [1300, 850, 180], [0, 0, 0]);
B("sample-cabinet", [936, 595, 1190], [0, 0, 180]);
B("work-shelf", [1092, 297.50, 120], [0, -263.50, 901]);
B("drip-tray", [1014, 612, 70], [0, 0, 200]);
C("sample-bottle-1", 476.00, 95, [-221.00, 0, 935.00]);
C("sample-bottle-2", 476.00, 95, [221.00, 0, 935.00]);
C("sample-bottle-3", 476.00, 95, [663.00, 0, 935.00]);

return p.model();
