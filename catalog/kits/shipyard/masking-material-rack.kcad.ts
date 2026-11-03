// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "masking-material-rack",
  license: "CC0-1.0",
  title: "Masking material rack",
  description: "Mobile rack for protective sheeting and tape rolls with a top crossbar, hanging dowels, and storage shelf. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7c867a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("masking-material-rack");

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

B("side-post-0", [120, 140, 1910], [-850, 0, 955]);
B("side-post-1", [120, 140, 1910], [850, 0, 955]);
B("top-crossbar", [1710, 180, 150], [0, 0, 1940]);
C("masking-roll-0", 980, 110, [-600, 0, 1430], [90, 0, 0], 12);
C("masking-roll-1", 980, 110, [-300, 0, 1430], [90, 0, 0], 12);
C("masking-roll-2", 980, 110, [0, 0, 1430], [90, 0, 0], 12);
C("masking-roll-3", 980, 110, [300, 0, 1430], [90, 0, 0], 12);
C("masking-roll-4", 980, 110, [600, 0, 1430], [90, 0, 0], 12);
B("lower-shelf", [1600, 800, 130], [0, 0, 330]);
C("caster-0", 80, 75, [-780, -320, 75], [0, 0, 0], 8);
C("caster-1", 80, 75, [780, -320, 75], [0, 0, 0], 8);
C("caster-2", 80, 75, [-780, 320, 75], [0, 0, 0], 8);
C("caster-3", 80, 75, [780, 320, 75], [0, 0, 0], 8);

return p.model();
