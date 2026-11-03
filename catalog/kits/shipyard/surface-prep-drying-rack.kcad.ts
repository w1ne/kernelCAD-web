// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "surface-prep-drying-rack",
  license: "CC0-1.0",
  title: "Surface preparation drying rack",
  description: "Open rack for small hull panels with four uprights, removable cross bars, tray feet, and spacing stops. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78847c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("surface-prep-drying-rack");

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

B("upright-0", [120, 140, 1940], [-920, -520, 970]);
B("upright-1", [120, 140, 1940], [920, -520, 970]);
B("upright-2", [120, 140, 1940], [-920, 520, 970]);
B("upright-3", [120, 140, 1940], [920, 520, 970]);
B("crossbar-0", [1840, 150, 110], [0, -520, 640]);
B("crossbar-1", [1840, 150, 110], [0, 520, 640]);
B("crossbar-2", [1840, 150, 110], [0, -520, 1310]);
B("crossbar-3", [1840, 150, 110], [0, 520, 1310]);
B("panel-stop-0", [130, 210, 580], [-720, -520, 1740]);
B("panel-stop-1", [130, 210, 580], [720, -520, 1740]);
B("panel-stop-2", [130, 210, 580], [-720, 520, 1740]);
B("panel-stop-3", [130, 210, 580], [720, 520, 1740]);
B("tray-foot-0", [380, 320, 130], [-920, -520, 65]);
B("tray-foot-1", [380, 320, 130], [920, -520, 65]);
B("tray-foot-2", [380, 320, 130], [-920, 520, 65]);
B("tray-foot-3", [380, 320, 130], [920, 520, 65]);

return p.model();
