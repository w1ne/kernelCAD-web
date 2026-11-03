// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "lemonade-dispenser-cart",
  license: "CC0-1.0",
  title: "Lemonade dispenser cart",
  description: "Beverage cart with paired transparent-tank silhouettes, tap handles, ice bin, and a push bar. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b89a50", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("lemonade-dispenser-cart");

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
