// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "optical-measurement-station",
  license: "CC0-1.0",
  title: "Optical measurement station",
  description: "Portable optical measurement head on a tripod base with a hooded sensor, side handle, and target mast. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "inspection and refit support"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#718780", { label: "Asset color" });
const originOffsetMm = 40;
const p = assembly("optical-measurement-station");

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

B("tripod-leg-0", [120, 120, 980], [-420, -320, 450]);
B("tripod-leg-1", [120, 120, 980], [420, -320, 450]);
B("tripod-leg-2", [120, 120, 980], [0, 420, 450]);
B("instrument-base", [580, 580, 180], [0, 0, 970]);
B("instrument-head", [720, 610, 540], [0, 0, 1330]);
B("optical-hood", [480, 440, 300], [0, -350, 1470]);
C("lens-ring", 100, 180, [0, -520, 1470], [90, 0, 0], 14);
B("side-handle", [100, 540, 100], [440, 100, 1350]);
B("target-mast", [80, 80, 780], [0, 430, 1420]);

return p.model();
