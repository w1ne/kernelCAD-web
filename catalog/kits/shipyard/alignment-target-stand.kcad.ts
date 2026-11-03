// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "alignment-target-stand",
  license: "CC0-1.0",
  title: "Alignment target stand",
  description: "Compact positioning stand with a tripod-like base, adjustable upright, target plate, and crosshair bezel. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d1a84e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("alignment-target-stand");

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

B("base-foot", [720, 720, 110], [0, 0, 55]);
B("upright", [100, 100, 1260], [0, 0, 685]);
B("target-plate", [620, 100, 620], [0, -35, 1390]);
B("target-center", [250, 80, 250], [0, -100, 1390]);
B("crosshair-0", [430, 35, 35], [0, -150, 1260]);
B("crosshair-1", [430, 35, 35], [0, -150, 1520]);
B("tripod-foot-0", [600, 160, 100], [-430, -330, 50]);
B("tripod-foot-1", [600, 160, 100], [430, -330, 50]);
B("tripod-foot-2", [600, 160, 100], [0, 430, 50]);

return p.model();
