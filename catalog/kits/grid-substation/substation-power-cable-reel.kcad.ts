// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-power-cable-reel",
  license: "CC0-1.0",
  title: "Power cable reel",
  description: "Portable cable reel with flanged drums, axle supports, and a low transport frame. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-power-cable-reel");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};
const CX = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([0, 1, 0], 90);
  place(name, shape, [at[0] - length / 2, at[1], at[2] + radius]);
};

B("transport-chassis", [1750, 684, 220], [0, 0, 0]);
B("reel-cheek", [160, 950, 1254], [-490.00, 0, 220]);
B("reel-cheek-2", [160, 950, 1254], [490.00, 0, 220]);
CY("transport-wheel", 150, 170, [-332.50, -204.25, 0]);
CY("transport-wheel-2", 150, 170, [-332.50, 204.25, 0]);
CY("transport-wheel-3", 150, 170, [332.50, -204.25, 0]);
CY("transport-wheel-4", 150, 170, [332.50, 204.25, 0]);
CX("cable-drum", 1172.50, 445.50, [0, 0, 594]);
B("axle", [1190, 180, 180], [0, 0, 874.50]);

return p.model();
