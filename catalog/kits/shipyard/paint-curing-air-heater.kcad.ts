// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "paint-curing-air-heater",
  license: "CC0-1.0",
  title: "Paint curing air heater",
  description: "Ducted industrial air heater on a skid with a fan cabinet, outlet plenum, and hose connection. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#a76845", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("paint-curing-air-heater");

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

B("heater-skid", [1700, 900, 140], [0, 0, 70]);
B("fan-cabinet", [900, 840, 980], [-300, 0, 630]);
B("outlet-plenum", [720, 720, 420], [530, 0, 1050]);
B("duct-collar", [300, 300, 230], [530, 0, 1380]);
C("fan-grille-spoke-0", 50, 330, [-300, -440, 680], [90, 0, 0], 12);
B("service-panel", [540, 60, 700], [-300, -460, 630]);
B("foot-0", [170, 180, 160], [-650, -320, 80]);
B("foot-1", [170, 180, 160], [650, -320, 80]);
B("foot-2", [170, 180, 160], [-650, 320, 80]);
B("foot-3", [170, 180, 160], [650, 320, 80]);

return p.model();
