// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "churro-warmer-cart",
  license: "CC0-1.0",
  title: "Churro warmer cart",
  description: "Narrow snack cart with a heated tray, draining rack, flour-dusting station, and bicycle-style wheels. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#bc8051", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("churro-warmer-cart");

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

B("cart-cabinet", [1460, 650, 760], [0, 0, 420]);
B("hot-tray", [1360, 520, 130], [0, -25, 850]);
C("churro-roller-0", 1100, 34, [-500, -25, 960], [0, 90, 0], 8);
C("churro-roller-1", 1100, 34, [-300, -25, 960], [0, 90, 0], 8);
C("churro-roller-2", 1100, 34, [-100, -25, 960], [0, 90, 0], 8);
C("churro-roller-3", 1100, 34, [100, -25, 960], [0, 90, 0], 8);
C("churro-roller-4", 1100, 34, [300, -25, 960], [0, 90, 0], 8);
C("churro-roller-5", 1100, 34, [500, -25, 960], [0, 90, 0], 8);
B("dusting-shelf", [600, 330, 80], [450, -390, 930]);
C("umbrella-pole", 1300, 42, [-500, 180, 800], [0, 0, 0], 8);
B("umbrella", [1180, 1100, 80], [-500, 180, 1470]);
C("wheel-0", 85, 210, [-520, -350, 210], [90, 0, 0], 10);
C("wheel-1", 85, 210, [520, -350, 210], [90, 0, 0], 10);

return p.model();
