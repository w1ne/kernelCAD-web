// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "portable-ventilation-fan",
  license: "CC0-1.0",
  title: "Portable ventilation fan",
  description: "Axial ventilation fan in a square carry frame with a circular hub, four broad blades, and a floor stand. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#708984", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("portable-ventilation-fan");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("fan-frame", [1180, 220, 1180], [0, 0, 710]);
C("fan-hub", 200, 230, [0, -170, 710], [90, 0, 0], 14);
B("fan-blade-0", [480, 100, 150], [0, -185, 1000]);
B("fan-blade-1", [480, 100, 150], [0, -185, 420]);
B("fan-blade-2", [480, 100, 150], [-290, -185, 710]);
B("fan-blade-3", [480, 100, 150], [290, -185, 710]);
B("stand-leg-0", [130, 130, 390], [-430, -350, 195]);
B("stand-leg-1", [130, 130, 390], [430, -350, 195]);
B("stand-leg-2", [130, 130, 390], [-430, 350, 195]);
B("stand-leg-3", [130, 130, 390], [430, 350, 195]);
B("carry-handle", [320, 80, 90], [0, 0, 1370]);

return p.model();
