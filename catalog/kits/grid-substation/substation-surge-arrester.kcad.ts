// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-surge-arrester",
  license: "CC0-1.0",
  title: "Surge arrester",
  description: "Ribbed surge arrester column with a top terminal and a bolted pedestal. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-surge-arrester");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("mounting-base", [600, 600, 180], [0, 0, 0]);
C("arrester-section-1", 252, 216, [0, 0, 180]);
C("arrester-section-2", 252, 186, [0, 0, 492]);
C("arrester-section-3", 252, 216, [0, 0, 804]);
C("arrester-section-4", 252, 186, [0, 0, 1116]);
C("arrester-section-5", 252, 216, [0, 0, 1428]);
C("arrester-section-6", 252, 186, [0, 0, 1740]);
B("top-terminal", [252, 252, 170], [0, 0, 2230]);

return p.model();
