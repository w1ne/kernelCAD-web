// Lemonade dispenser cart: Beverage cart with paired transparent-tank silhouettes, tap handles, ice bin, and a push bar.
meta({
  name: "lemonade-dispenser-cart",
  license: "CC0-1.0",
  title: "Lemonade dispenser cart",
  description: "Beverage cart with paired transparent-tank silhouettes, tap handles, ice bin, and a push bar. Controls: overall scale, stainlessSteel, acrylic, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "acrylic": "#79c8d2",
    "rubber": "#3c4245"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "acrylic": "#41768b",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("lemonade-dispenser-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["drink-tank-0", "drink-tank-1", "front-counter", "ice-bin", "tap-0", "tap-1"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["wheel-0", "wheel-1", "wheel-2", "wheel-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["cart-frame", "push-bar"].includes(name)) p.part(name, positioned.color(acrylic));
  else p.part(name, positioned.color(stainlessSteel));
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

B("cart-frame", [1520, 820, 160], [0, 0, 80]);
B("front-counter", [1530, 850, 720], [0, 0, 520]);
C("drink-tank-0", 670, 250, [-390, 0, 1040], [0, 0, 0], 12);
C("drink-tank-1", 670, 250, [390, 0, 1040], [0, 0, 0], 12);
C("tap-0", 150, 46, [-390, -290, 720], [90, 0, 0], 8);
C("tap-1", 150, 46, [390, -290, 720], [90, 0, 0], 8);
B("ice-bin", [400, 500, 300], [0, 180, 1000]);
B("push-bar", [850, 85, 85], [0, 500, 740]);
C("wheel-0", 80, 180, [-550, -350, 180], [90, 0, 0], 10);
C("wheel-1", 80, 180, [550, -350, 180], [90, 0, 0], 10);
C("wheel-2", 80, 180, [-550, 350, 180], [90, 0, 0], 10);
C("wheel-3", 80, 180, [550, 350, 180], [90, 0, 0], 10);

return p.model();
