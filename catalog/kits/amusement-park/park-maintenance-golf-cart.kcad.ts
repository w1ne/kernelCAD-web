// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-maintenance-golf-cart",
  license: "CC0-1.0",
  title: "Park maintenance cart",
  description: "Compact utility cart with open operator cab, short cargo bed, front bumper, and four treaded wheels. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7e8a62", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("park-maintenance-golf-cart");

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

B("chassis", [1950, 1030, 190], [0, 0, 330]);
B("cargo-bed", [860, 960, 490], [-500, 0, 680]);
B("hood", [770, 860, 440], [620, 0, 620]);
B("operator-floor", [510, 880, 125], [240, 0, 500]);
B("front-screen", [80, 900, 650], [580, 0, 930], [0, -8, 0]);
B("roof", [1350, 1160, 110], [130, 0, 1450]);
B("cab-post-0", [75, 75, 860], [-380, -390, 1030]);
B("cab-post-1", [75, 75, 860], [-380, 390, 1030]);
B("cab-post-2", [75, 75, 860], [600, -390, 1030]);
B("cab-post-3", [75, 75, 860], [600, 390, 1030]);
C("wheel-0", 125, 285, [-630, -560, 285], [90, 0, 0], 10);
C("wheel-1", 125, 285, [630, -560, 285], [90, 0, 0], 10);
C("wheel-2", 125, 285, [-630, 560, 285], [90, 0, 0], 10);
C("wheel-3", 125, 285, [630, 560, 285], [90, 0, 0], 10);
B("front-bumper", [240, 1120, 160], [1100, 0, 230]);

return p.model();
