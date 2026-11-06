// Junior coaster train car: Two-row family coaster car with paired wheels, lap-bar silhouettes, and a raised front fairing.
meta({
  name: "junior-coaster-train-car",
  license: "CC0-1.0",
  title: "Junior coaster train car",
  description: "Two-row family coaster car with paired wheels, lap-bar silhouettes, and a raised front fairing. Controls: overall scale, fiberglass, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "fiberglass": "#d7a83f",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "fiberglass": "#96566d",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = -15;
const p = assembly("junior-coaster-train-car");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["front-fairing", "front-seat", "rear-seat"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["wheel-0", "wheel-1", "wheel-2", "wheel-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["chassis", "lap-bar-0", "lap-bar-1"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(fiberglass));
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

B("chassis", [1450, 820, 180], [0, 0, 360]);
B("front-fairing", [540, 820, 470], [500, 0, 640], [0, -12, 0]);
B("rear-seat", [420, 740, 250], [-460, 0, 730]);
B("front-seat", [420, 740, 250], [260, 0, 730]);
B("lap-bar-0", [75, 650, 280], [-460, 0, 860], [0, 0, 0]);
B("lap-bar-1", [75, 650, 280], [260, 0, 860], [0, 0, 0]);
C("wheel-0", 90, 135, [-520, -360, 150], [90, 0, 0], 10);
C("wheel-1", 90, 135, [520, -360, 150], [90, 0, 0], 10);
C("wheel-2", 90, 135, [-520, 360, 150], [90, 0, 0], 10);
C("wheel-3", 90, 135, [520, 360, 150], [90, 0, 0], 10);

return p.model();
