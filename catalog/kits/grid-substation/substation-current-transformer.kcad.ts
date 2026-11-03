// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-current-transformer",
  license: "CC0-1.0",
  title: "Current transformer",
  description: "Pedestal current transformer with a broad upper ring body and terminal pads. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-current-transformer");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};

B("base-plate", [850, 800, 180], [0, 0, 0]);
C("pedestal", 968, 119.00, [0, 0, 180]);
B("core-body", [629, 592, 506], [0, 0, 1012]);
B("upper-ring", [807.50, 736, 200], [0, 0, 1628]);
B("secondary-box", [357, 304, 352], [204, 180, 264]);

return p.model();
