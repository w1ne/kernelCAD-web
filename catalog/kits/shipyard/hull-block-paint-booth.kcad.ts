// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-block-paint-booth",
  license: "CC0-1.0",
  title: "Hull block paint booth",
  description: "Walk-in coating-bay frame with a wide entry, roof trusses, side curtains, and a raised extraction plenum. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#77867e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-block-paint-booth");

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

B("corner-post-0", [130, 130, 2780], [-1500, -1100, 1390]);
B("corner-post-1", [130, 130, 2780], [1500, -1100, 1390]);
B("corner-post-2", [130, 130, 2780], [-1500, 1100, 1390]);
B("corner-post-3", [130, 130, 2780], [1500, 1100, 1390]);
B("roof-joist-0", [130, 2200, 140], [-1000, 0, 2810]);
B("roof-joist-1", [130, 2200, 140], [0, 0, 2810]);
B("roof-joist-2", [130, 2200, 140], [1000, 0, 2810]);
B("side-curtain-0", [90, 1850, 2500], [-1500, 0, 1440]);
B("side-curtain-1", [90, 1850, 2500], [1500, 0, 1440]);
B("extraction-plenum", [2760, 500, 260], [0, 0, 3050]);
B("entry-guide-0", [90, 130, 1200], [-1410, -1110, 600]);
B("entry-guide-1", [90, 130, 1200], [1410, -1110, 600]);

return p.model();
