// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "ship-lift-cradle",
  license: "CC0-1.0",
  title: "Ship lift cradle",
  description: "Transfer cradle with paired guide rails, cross ties, adjustable hull pads, and four guide rollers. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "yard and dock operations"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#76847b", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ship-lift-cradle");

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

B("side-rail-0", [3000, 220, 260], [0, -740, 190]);
B("side-rail-1", [3000, 220, 260], [0, 740, 190]);
B("cross-tie-0", [180, 1430, 130], [-1100, 0, 105]);
B("cross-tie-1", [180, 1430, 130], [0, 0, 105]);
B("cross-tie-2", [180, 1430, 130], [1100, 0, 105]);
B("hull-pad-0", [300, 320, 520], [-1050, -480, 520]);
B("hull-pad-1", [300, 320, 520], [-1050, 480, 520]);
B("hull-pad-2", [300, 320, 520], [1050, -480, 520]);
B("hull-pad-3", [300, 320, 520], [1050, 480, 520]);
C("guide-roller-0", 220, 90, [-1280, -760, 90], [90, 0, 0], 10);
C("guide-roller-1", 220, 90, [1280, -760, 90], [90, 0, 0], 10);
C("guide-roller-2", 220, 90, [-1280, 760, 90], [90, 0, 0], 10);
C("guide-roller-3", 220, 90, [1280, 760, 90], [90, 0, 0], 10);

return p.model();
