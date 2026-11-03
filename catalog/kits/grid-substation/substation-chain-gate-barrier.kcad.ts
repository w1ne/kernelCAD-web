// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-chain-gate-barrier",
  license: "CC0-1.0",
  title: "Chain gate barrier",
  description: "Two freestanding bollards joined by a raised chain line across an access lane. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-chain-gate-barrier");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("bollard-base", [420, 450, 220], [-1312, 0, 0]);
C("bollard", 1030, 110, [-1312, 0, 220]);
B("chain-lug", [240, 220, 130], [-1312, 0, 830]);
B("bollard-base-2", [420, 450, 220], [1312, 0, 0]);
C("bollard-2", 1030, 110, [1312, 0, 220]);
B("chain-lug-2", [240, 220, 130], [1312, 0, 830]);
B("chain-link", [2304, 110, 95], [0, 0, 825]);

return p.model();
