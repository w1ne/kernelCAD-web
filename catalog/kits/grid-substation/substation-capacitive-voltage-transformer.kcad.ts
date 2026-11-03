// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-capacitive-voltage-transformer",
  license: "CC0-1.0",
  title: "Capacitive voltage transformer",
  description: "Capacitive voltage transformer with stacked divider sections and an upper terminal. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-capacitive-voltage-transformer");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [1250, 950, 180], [0, 0, 0]);
C("pedestal", 1276, 175.00, [0, 0, 180]);
C("divider-section-1", 348, 425.00, [0, 0, 1276]);
C("divider-section-2", 348, 381.25, [0, 0, 1653.00]);
C("divider-section-3", 348, 337.50, [0, 0, 2030.00]);
C("divider-section-4", 348, 293.75, [0, 0, 2407]);
B("secondary-box", [525, 361, 464], [300, 213.75, 348]);

return p.model();
