// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-optical-current-transformer",
  license: "CC0-1.0",
  title: "Optical current transformer",
  description: "Tall optical current sensor with a distinctive open sensing loop above its support. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-optical-current-transformer");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [900, 820, 180], [0, 0, 0]);
C("pedestal", 1078, 126.00, [0, 0, 180]);
B("sensor-body", [612, 541.20, 416.50], [0, 0, 1053.50]);
B("sensor-loop-left", [150, 98.40, 1078], [-270, 0, 1421]);
B("sensor-loop-right", [150, 98.40, 1078], [270, 0, 1421]);
B("sensor-bridge", [594, 98.40, 140], [0, 0, 2303]);
B("secondary-box", [378, 311.60, 392], [216, 184.50, 294]);

return p.model();
