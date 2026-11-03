// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-inductive-voltage-transformer",
  license: "CC0-1.0",
  title: "Inductive voltage transformer",
  description: "Compact voltage transformer with a stepped body, mounting pedestal, and top terminal. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-inductive-voltage-transformer");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [1000, 900, 180], [0, 0, 0]);
C("pedestal", 1034, 140, [0, 0, 180]);
B("transformer-body", [820, 702, 658.00], [0, 0, 1057.50]);
B("top-terminal", [360, 315, 180], [0, 0, 2170]);
B("secondary-box", [420, 342, 376], [240, 202.50, 282]);

return p.model();
