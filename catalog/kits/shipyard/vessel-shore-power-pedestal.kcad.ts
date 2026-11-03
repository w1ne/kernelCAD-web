// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "vessel-shore-power-pedestal",
  license: "CC0-1.0",
  title: "Vessel shore power pedestal",
  description: "Weatherproof service cabinet on a raised plinth with cable outlets, protective cover, and side cable hooks. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "outfitting and yard services"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#6f8580", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("vessel-shore-power-pedestal");

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

B("plinth", [880, 820, 180], [0, 0, 90]);
B("cabinet", [720, 650, 1560], [0, 0, 960]);
B("door", [570, 55, 1180], [0, -355, 1010]);
C("outlet-0", 110, 90, [-180, -410, 630], [90, 0, 0], 10);
C("outlet-1", 110, 90, [180, -410, 630], [90, 0, 0], 10);
C("outlet-2", 110, 90, [-180, -410, 1120], [90, 0, 0], 10);
C("outlet-3", 110, 90, [180, -410, 1120], [90, 0, 0], 10);
B("cable-hook-0", [90, 300, 90], [-420, 400, 1030]);
B("cable-hook-1", [90, 300, 90], [420, 400, 1030]);

return p.model();
