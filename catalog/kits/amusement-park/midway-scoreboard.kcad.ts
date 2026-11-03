// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "midway-scoreboard",
  license: "CC0-1.0",
  title: "Midway scoreboard",
  description: "Freestanding race scoreboard with two lane panels, a roof cap, and a weighted ground frame. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#737f83", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("midway-scoreboard");

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

B("base", [1420, 640, 100], [0, 0, 50]);
B("left-panel", [620, 150, 920], [-340, 0, 970]);
B("right-panel", [620, 150, 920], [340, 0, 970]);
B("center-divider", [80, 160, 940], [0, 0, 970]);
B("header", [1500, 240, 210], [0, 0, 1540]);
B("roof", [1680, 850, 110], [0, 0, 1710]);
C("score-lamp-0", 80, 48, [-490, -110, 1560], [0, 0, 0], 8);
C("score-lamp-1", 80, 48, [-165, -110, 1560], [0, 0, 0], 8);
C("score-lamp-2", 80, 48, [165, -110, 1560], [0, 0, 0], 8);
C("score-lamp-3", 80, 48, [490, -110, 1560], [0, 0, 0], 8);

return p.model();
