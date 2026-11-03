// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "refillable-cup-rack",
  license: "CC0-1.0",
  title: "Refillable cup rack",
  description: "Countertop carousel for reusable park cups with a rotating-style central mast and four storage shelves. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7d9188", { label: "Asset color" });
const originOffsetMm = -48;
const p = assembly("refillable-cup-rack");

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

C("base", 95, 540, [0, 0, 48], [0, 0, 0], 12);
C("mast", 1150, 65, [0, 0, 95]);
B("cup-shelf-0", [1100, 800, 80], [0, 0, 280]);
B("cup-shelf-1", [1100, 800, 80], [0, 0, 520]);
B("cup-shelf-2", [1100, 800, 80], [0, 0, 760]);
B("cup-shelf-3", [1100, 800, 80], [0, 0, 1000]);
C("cup-holder-0", 170, 140, [320, 210, 420], [0, 0, 0], 8);
C("cup-holder-1", 170, 140, [-320, 210, 660], [0, 0, 0], 8);
C("cup-holder-2", 170, 140, [320, -210, 900], [0, 0, 0], 8);
C("cup-holder-3", 170, 140, [-320, -210, 1140], [0, 0, 0], 8);
B("top-cap", [460, 460, 90], [0, 0, 1270]);

return p.model();
