// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-oil-cooling-pump-skid",
  license: "CC0-1.0",
  title: "Oil cooling pump skid",
  description: "Skid-mounted pump and motor pair with visible suction and discharge piping. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "transformer bay and auxiliaries"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-oil-cooling-pump-skid");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("skid-base", [2500, 1300, 220], [0, 0, 0]);
B("pump-housing", [800, 598, 752.50], [-425.00, 0, 220]);
C("motor", 840, 425.00, [312.50, 0, 220]);
B("coupling-guard", [450, 650, 490.00], [-50, 0, 250]);
B("suction-pipe", [1750, 170, 170], [-225, -344.50, 840]);
B("discharge-pipe", [1250, 170, 170], [-425.00, 292.50, 1277.50]);
B("pipe-support", [160, 160, 840], [-437.50, 312, 220]);
B("pipe-support-2", [160, 160, 840], [525, 312, 220]);

return p.model();
