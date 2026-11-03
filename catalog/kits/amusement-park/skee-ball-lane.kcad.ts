// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "skee-ball-lane",
  license: "CC0-1.0",
  title: "Skee-ball lane",
  description: "Single midway rolling lane with a sloped launch bed, side gutters, target arch, and scoring pockets. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#957657", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("skee-ball-lane");

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

B("lane-base", [3250, 850, 170], [0, 0, 85]);
B("ramp-bed", [2130, 730, 140], [-400, 0, 400], [0, 12, 0]);
B("left-gutter", [2300, 90, 250], [-360, -390, 410]);
B("right-gutter", [2300, 90, 250], [-360, 390, 410]);
B("target-backboard", [300, 900, 1230], [1300, 0, 1030]);
C("score-ring-0", 65, 240, [1260, -260, 1190], [0, 90, 0], 10);
C("score-ring-1", 65, 180, [1260, 0, 1360], [0, 90, 0], 10);
C("score-ring-2", 65, 240, [1260, 260, 1190], [0, 90, 0], 10);
B("score-pocket-0", [180, 230, 210], [1190, -270, 700]);
B("score-pocket-1", [180, 230, 210], [1190, 0, 700]);
B("score-pocket-2", [180, 230, 210], [1190, 270, 700]);

return p.model();
