// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-precast-cable-trench",
  license: "CC0-1.0",
  title: "Precast cable trench section",
  description: "Open-topped precast cable trench segment with reinforced sidewalls and end lips. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-precast-cable-trench");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};

B("trench-floor", [4200, 900, 180], [0, 0, 0]);
B("wall-left", [4200, 170, 720], [0, -365, 180]);
B("wall-right", [4200, 170, 720], [0, 365, 180]);
B("end-left", [170, 900, 720], [-2015, 0, 180]);
B("end-right", [170, 900, 720], [2015, 0, 180]);
B("cable-run-1", [3528, 85, 85], [0, -247.50, 220]);
B("cable-run-2", [3528, 85, 85], [0, 49.50, 320]);
B("cable-run-3", [3528, 85, 85], [0, 346.50, 420]);
B("cable-run-4", [3528, 85, 85], [0, 643.50, 520]);

return p.model();
