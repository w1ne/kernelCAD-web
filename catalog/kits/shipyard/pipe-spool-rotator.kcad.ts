// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "pipe-spool-rotator",
  license: "CC0-1.0",
  title: "Pipe spool rotator",
  description: "Weld-fit rotator with two roller stands, guarded drive housing, foot controls, and a pipe centering stop. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#ad764a", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("pipe-spool-rotator");

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

B("roller-frame-0", [760, 520, 720], [-760, 0, 360]);
B("roller-frame-1", [760, 520, 720], [760, 0, 360]);
C("drive-roller-0", 620, 125, [-760, -190, 910], [90, 0, 0], 12);
C("drive-roller-1", 620, 125, [-760, 190, 910], [90, 0, 0], 12);
C("drive-roller-2", 620, 125, [760, -190, 910], [90, 0, 0], 12);
C("drive-roller-3", 620, 125, [760, 190, 910], [90, 0, 0], 12);
B("drive-cabinet", [450, 360, 500], [-760, -430, 250]);
B("foot-pedal", [320, 260, 90], [480, -460, 45]);
B("pipe-stop", [120, 540, 300], [1150, 0, 900]);

return p.model();
