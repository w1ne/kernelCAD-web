// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "assembly-block-pivot-dolly",
  license: "CC0-1.0",
  title: "Assembly block pivot dolly",
  description: "Transfer dolly with a low pivot table, lock pins, paired bogies, and an adjustable central saddle. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "block and material movement"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#75847d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("assembly-block-pivot-dolly");

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

B("underframe", [1980, 1160, 260], [0, 0, 300]);
B("pivot-table", [1460, 980, 180], [0, 0, 620]);
C("pivot-ring", 90, 520, [0, 0, 755], [0, 0, 0], 16);
B("saddle", [780, 620, 360], [0, 0, 1010]);
C("bogie-wheel-0", 150, 165, [-760, -500, 165], [90, 0, 0], 10);
C("bogie-wheel-1", 150, 165, [-760, 500, 165], [90, 0, 0], 10);
C("bogie-wheel-2", 150, 165, [760, -500, 165], [90, 0, 0], 10);
C("bogie-wheel-3", 150, 165, [760, 500, 165], [90, 0, 0], 10);
B("lock-pin-0", [120, 120, 300], [-620, -390, 860]);
B("lock-pin-1", [120, 120, 300], [620, -390, 860]);
B("lock-pin-2", [120, 120, 300], [-620, 390, 860]);
B("lock-pin-3", [120, 120, 300], [620, 390, 860]);

return p.model();
