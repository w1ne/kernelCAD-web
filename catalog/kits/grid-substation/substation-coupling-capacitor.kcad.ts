// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-coupling-capacitor",
  license: "CC0-1.0",
  title: "Coupling capacitor",
  description: "Stacked capacitor column on a frame with a small secondary terminal box. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-coupling-capacitor");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [1120, 900, 180], [0, 0, 0]);
C("pedestal", 1144, 156.80, [0, 0, 180]);
C("divider-section-1", 312, 380.80, [0, 0, 1144]);
C("divider-section-2", 312, 341.60, [0, 0, 1482.00]);
C("divider-section-3", 312, 302.40, [0, 0, 1820.00]);
C("divider-section-4", 312, 263.20, [0, 0, 2158]);
B("secondary-box", [470.40, 342, 416], [268.80, 202.50, 312]);

return p.model();
