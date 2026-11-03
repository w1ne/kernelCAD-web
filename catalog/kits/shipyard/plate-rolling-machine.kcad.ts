// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "plate-rolling-machine",
  license: "CC0-1.0",
  title: "Plate rolling machine",
  description: "Three-roll plate former with a rigid bed, two lower rollers, upper pressure roller, and side drive cabinet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#687e79", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("plate-rolling-machine");

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

B("machine-bed", [1800, 1020, 270], [0, 0, 135]);
C("lower-roll-0", 1050, 210, [-470, 0, 510], [90, 0, 0], 14);
C("lower-roll-1", 1050, 210, [470, 0, 510], [90, 0, 0], 14);
C("upper-pressure-roll", 1050, 240, [0, 0, 1120], [90, 0, 0], 14);
B("bearing-tower-0", [180, 920, 1430], [-800, 0, 780]);
B("bearing-tower-1", [180, 920, 1430], [800, 0, 780]);
B("drive-cabinet", [500, 570, 760], [1180, 0, 380]);
B("control-pendant", [250, 100, 360], [1170, -360, 920]);

return p.model();
