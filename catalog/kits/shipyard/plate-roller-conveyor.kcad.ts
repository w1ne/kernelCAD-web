// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({
  name: "plate-roller-conveyor",
  license: "CC0-1.0",
  title: "Plate roller conveyor",
  description: "Section of plate feed line with a heavy frame, transverse rollers, side guides, and adjustable feet. Editable overall scale and asset color.",
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", "plate and block fabrication"],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78847e", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("plate-roller-conveyor");

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

B("side-frame-0", [2550, 140, 280], [0, -680, 140]);
B("side-frame-1", [2550, 140, 280], [0, 680, 140]);
C("feed-roller-0", 115, 115, [-1000, 0, 300], [90, 0, 0], 10);
C("feed-roller-1", 115, 115, [-600, 0, 300], [90, 0, 0], 10);
C("feed-roller-2", 115, 115, [-200, 0, 300], [90, 0, 0], 10);
C("feed-roller-3", 115, 115, [200, 0, 300], [90, 0, 0], 10);
C("feed-roller-4", 115, 115, [600, 0, 300], [90, 0, 0], 10);
C("feed-roller-5", 115, 115, [1000, 0, 300], [90, 0, 0], 10);
B("guide-rail-0", [2350, 100, 230], [0, -720, 460]);
B("guide-rail-1", [2350, 100, 230], [0, 720, 460]);
B("leveling-foot-0", [160, 160, 100], [-1100, -650, 50]);
B("leveling-foot-1", [160, 160, 100], [1100, -650, 50]);
B("leveling-foot-2", [160, 160, 100], [-1100, 650, 50]);
B("leveling-foot-3", [160, 160, 100], [1100, 650, 50]);

return p.model();
