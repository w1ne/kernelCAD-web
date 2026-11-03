// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({
  name: "substation-hydraulic-breaker-service-trolley",
  license: "CC0-1.0",
  title: "Breaker service trolley",
  description: "Low service trolley with hydraulic power pack, hose reel, and lifting handle. Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "maintenance and safety"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#73828b", { label: "Asset color" });
const p = assembly("substation-hydraulic-breaker-service-trolley");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};
const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};
const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};

B("cart-chassis", [1900, 703, 220], [0, 0, 0]);
CY("caster", 237.50, 150, [-684, -342, 0]);
CY("caster-2", 237.50, 150, [-684, 342, 0]);
CY("caster-3", 237.50, 150, [684, -342, 0]);
CY("caster-4", 237.50, 150, [684, 342, 0]);
B("hydraulic-unit", [1102, 532, 575], [0, 0, 220]);
C("oil-reservoir", 483, 228, [323, 80.75, 220]);
B("hose-reel", [380, 237.50, 483], [-332.50, 0, 220]);
B("push-handle-left", [90, 100, 575], [-741, 142.50, 220]);
B("push-handle-right", [90, 100, 575], [741, 142.50, 220]);
B("handle-crossbar", [1368, 100, 100], [0, 142.50, 759]);

return p.model();
