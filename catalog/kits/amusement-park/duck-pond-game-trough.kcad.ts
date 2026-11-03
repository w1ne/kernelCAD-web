// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "duck-pond-game-trough",
  license: "CC0-1.0",
  title: "Duck pond game trough",
  description: "Shallow midway fishing-game basin with a raised rim, four duck targets, and a prize-catch lip. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7b9ca0", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("duck-pond-game-trough");

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
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

B("basin", [1880, 1460, 250], [0, 0, 125]);
B("rim-front", [2010, 100, 140], [0, -730, 320]);
B("rim-back", [2010, 100, 140], [0, 730, 320]);
B("rim-left", [100, 1360, 140], [-960, 0, 320]);
B("rim-right", [100, 1360, 140], [960, 0, 320]);
S("duck-target-0", 125, [-520, -350, 430]);
S("duck-target-1", 125, [-170, 260, 430]);
S("duck-target-2", 125, [210, -160, 430]);
S("duck-target-3", 125, [540, 330, 430]);
B("prize-lip", [600, 150, 300], [0, -805, 210]);

return p.model();
