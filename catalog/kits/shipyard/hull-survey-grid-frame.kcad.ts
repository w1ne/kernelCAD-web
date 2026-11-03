// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "hull-survey-grid-frame",
  license: "CC0-1.0",
  title: "Hull survey grid frame",
  description: "Portable reference frame with an open rectangle, graduated crossbars, leveling feet, and target mounts. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6e817a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("hull-survey-grid-frame");

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

B("frame-rail-0", [2300, 110, 120], [0, -650, 60]);
B("frame-rail-1", [2300, 110, 120], [0, 650, 60]);
B("frame-rail-2", [2300, 110, 120], [0, -650, 1800]);
B("frame-rail-3", [2300, 110, 120], [0, 650, 1800]);
B("upright-0", [110, 110, 1800], [-1150, -650, 900]);
B("upright-1", [110, 110, 1800], [1150, -650, 900]);
B("upright-2", [110, 110, 1800], [-1150, 650, 900]);
B("upright-3", [110, 110, 1800], [1150, 650, 900]);
B("cross-reference-0", [180, 1320, 100], [-600, 0, 650]);
B("cross-reference-1", [180, 1320, 100], [0, 0, 900]);
B("cross-reference-2", [180, 1320, 100], [600, 0, 1150]);

return p.model();
