// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-pressure-relief-device",
  license: "CC0-1.0",
  title: "Pressure relief device",
  description: "Compact relief valve housing with a raised indicator cap and flange foot. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-pressure-relief-device");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("flange", [680, 620, 180], [0, 0, 0]);
C("valve-body", 546, 204, [0, 0, 180]);
B("bonnet", [380.80, 347.20, 230], [0, 0, 672]);
B("indicator-cap", [285.60, 260.40, 200], [0, 0, 850]);
B("side-port", [163.20, 310, 180], [187.00, 0, 441]);

return p.model();
