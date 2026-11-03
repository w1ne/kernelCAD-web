// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "caisson-ballast-manifold-stand",
  license: "CC0-1.0",
  title: "Caisson ballast manifold stand",
  description: "Pipework display skid with a header, four branch valves, support feet, and a drain receiver. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#67847e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("caisson-ballast-manifold-stand");

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

B("base-skid", [1900, 700, 130], [0, 0, 65]);
B("header-pipe", [1540, 160, 160], [0, 0, 1110]);
B("branch-pipe-0", [150, 150, 760], [-570, 0, 670]);
B("branch-pipe-1", [150, 150, 760], [-190, 0, 670]);
B("branch-pipe-2", [150, 150, 760], [190, 0, 670]);
B("branch-pipe-3", [150, 150, 760], [570, 0, 670]);
C("handwheel-0", 55, 145, [-570, -110, 1010], [90, 0, 0], 12);
C("handwheel-1", 55, 145, [-190, -110, 1010], [90, 0, 0], 12);
C("handwheel-2", 55, 145, [190, -110, 1010], [90, 0, 0], 12);
C("handwheel-3", 55, 145, [570, -110, 1010], [90, 0, 0], 12);
B("support-foot-0", [130, 130, 900], [-760, -220, 520]);
B("support-foot-1", [130, 130, 900], [760, -220, 520]);
B("support-foot-2", [130, 130, 900], [-760, 220, 520]);
B("support-foot-3", [130, 130, 900], [760, 220, 520]);
B("drain-receiver", [440, 500, 370], [760, 0, 250]);

return p.model();
