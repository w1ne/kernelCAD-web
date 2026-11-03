// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-bus-post-insulator",
  license: "CC0-1.0",
  title: "Bus post insulator stack",
  description: "Reinforced ribbed post stack with a broad top cap for a yard bus support. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-bus-post-insulator");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("mounting-foot", [520, 520, 160], [0, 0, 0]);
C("core", 1200, 93.60, [0, 0, 160]);
C("shed-1", 90, 239.20, [0, 0, 250]);
C("shed-2", 90, 239.20, [0, 0, 436]);
C("shed-3", 90, 239.20, [0, 0, 622]);
C("shed-4", 90, 239.20, [0, 0, 808]);
C("shed-5", 90, 239.20, [0, 0, 994]);
C("shed-6", 90, 239.20, [0, 0, 1180]);
B("top-cap", [322.40, 322.40, 145], [0, 0, 1405]);

return p.model();
