// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "prize-wall-display",
  license: "CC0-1.0",
  title: "Midway prize wall",
  description: "Prize counter backdrop with three open display shelves, hanging plush silhouettes, and a lower redemption ledge. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#9a7960", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("prize-wall-display");

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

B("back-panel", [2200, 120, 1850], [0, 430, 925]);
B("display-shelf-0", [2100, 550, 80], [0, 180, 540]);
B("display-shelf-1", [2100, 550, 80], [0, 180, 1020]);
B("display-shelf-2", [2100, 550, 80], [0, 180, 1500]);
S("prize-plush-0", 150, [-700, 0, 710]);
S("prize-plush-1", 150, [0, 0, 710]);
S("prize-plush-2", 150, [700, 0, 710]);
S("prize-plush-3", 150, [-700, 0, 1190]);
S("prize-plush-4", 150, [0, 0, 1190]);
S("prize-plush-5", 150, [700, 0, 1190]);
S("prize-plush-6", 150, [-700, 0, 1670]);
S("prize-plush-7", 150, [0, 0, 1670]);
S("prize-plush-8", 150, [700, 0, 1670]);
B("redemption-counter", [2300, 700, 850], [0, -80, 425]);
B("counter-lip", [2400, 160, 120], [0, -430, 870]);

return p.model();
