// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "cotton-candy-cart",
  license: "CC0-1.0",
  title: "Cotton candy cart",
  description: "Push cart with a round candy bowl, umbrella mast, flavor tubs, push handle, and paired wheels. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#c77f93", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("cotton-candy-cart");

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

B("cart-bed", [1220, 740, 170], [0, 0, 560]);
B("cart-cabinet", [960, 650, 580], [0, 0, 920]);
C("candy-bowl", 480, 390, [0, -20, 1460], [0, 0, 0], 14);
C("spinner-hub", 260, 85, [0, -20, 1460]);
C("umbrella-pole", 1220, 40, [510, 240, 840], [0, 0, 0], 8);
B("umbrella-canopy", [1420, 1380, 100], [510, 240, 1500]);
B("flavor-tub-0", [240, 240, 220], [-340, -300, 1320]);
B("flavor-tub-1", [240, 240, 220], [0, -300, 1320]);
B("flavor-tub-2", [240, 240, 220], [340, -300, 1320]);
C("wheel-axle", 880, 62, [0, 440, 260], [90, 0, 0], 10);
B("axle-bracket-0", [90, 120, 250], [-430, 0, 390]);
B("axle-bracket-1", [90, 120, 250], [430, 0, 390]);
C("wheel-0", 90, 260, [-430, -390, 260], [90, 0, 0], 10);
C("wheel-1", 90, 260, [430, -390, 260], [90, 0, 0], 10);
B("push-handle", [720, 70, 70], [0, 390, 930]);

return p.model();
