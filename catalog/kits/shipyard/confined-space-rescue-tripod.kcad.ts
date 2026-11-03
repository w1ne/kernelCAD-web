// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "confined-space-rescue-tripod",
  license: "CC0-1.0",
  title: "Confined-space rescue tripod",
  description: "Portable access tripod with three feet, a head bridge, a winch housing, and a suspended retrieval line. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d19f45", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("confined-space-rescue-tripod");

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

B("tripod-leg-0", [130, 130, 1940], [-650, -500, 970]);
B("tripod-leg-1", [130, 130, 1940], [650, -500, 970]);
B("tripod-leg-2", [130, 130, 1940], [0, 650, 970]);
B("head-bridge", [1380, 180, 180], [0, 0, 1980]);
B("winch-housing", [430, 330, 420], [0, -100, 1680]);
C("retrieval-drum", 340, 150, [0, -280, 1660], [90, 0, 0], 12);
B("retrieval-line", [60, 60, 1440], [0, -280, 880]);
B("foot-pad-0", [360, 280, 110], [-650, -500, 55]);
B("foot-pad-1", [360, 280, 110], [650, -500, 55]);
B("foot-pad-2", [360, 280, 110], [0, 650, 55]);

return p.model();
