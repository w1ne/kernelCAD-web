// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-transformer-cooling-fan",
  license: "CC0-1.0",
  title: "Transformer cooling fan unit",
  description: "Fan and motor unit mounted in a protective frame for an oil cooler bank. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-transformer-cooling-fan");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("fan-skid", [1300, 850, 220], [0, 0, 0]);
B("fan-guard", [1118, 220, 1332], [0, -233.75, 220]);
C("fan-housing-1", 240, 272, [-364.00, 0, 777]);
B("fan-motor-1", [208, 357, 444], [-364.00, 106.25, 250]);
C("fan-housing-2", 240, 272, [0, 0, 777]);
B("fan-motor-2", [208, 357, 444], [0, 106.25, 250]);
C("fan-housing-3", 240, 272, [364.00, 0, 777]);
B("fan-motor-3", [208, 357, 444], [364.00, 106.25, 250]);

return p.model();
