// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "abrasive-blast-pot",
  license: "CC0-1.0",
  title: "Abrasive blast pot",
  description: "Portable pressure pot with a rounded vessel, top hopper, control manifold, twin wheels, and hose outlet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "surface preparation and coating"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#a46c4e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("abrasive-blast-pot");

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

C("pressure-vessel", 950, 390, [0, 0, 690], [0, 0, 0], 14);
C("hopper", 360, 300, [0, 0, 1320], [0, 0, 0], 12);
B("top-lid", [610, 610, 120], [0, 0, 1570]);
B("manifold", [620, 150, 180], [0, -340, 790]);
C("wheel-0", 100, 220, [-520, 0, 220], [0, 90, 0], 12);
C("wheel-1", 100, 220, [520, 0, 220], [0, 90, 0], 12);
B("hose-outlet", [190, 190, 350], [430, -180, 390]);
B("handle", [100, 700, 100], [-570, 0, 1120]);

return p.model();
