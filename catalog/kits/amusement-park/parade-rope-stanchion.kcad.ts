// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "parade-rope-stanchion",
  license: "CC0-1.0",
  title: "Parade rope stanchion pair",
  description: "Portable crowd-control rope set with two weighted posts, a cross-span rail, and a central clip. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#b5955f", { label: "Asset color" });
const originOffsetMm = -50;
const p = assembly("parade-rope-stanchion");

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

C("weighted-base-0", 100, 210, [-1150, 0, 50], [0, 0, 0], 12);
C("weighted-base-1", 100, 210, [1150, 0, 50], [0, 0, 0], 12);
C("post-0", 1020, 48, [-1150, 0, 610], [0, 0, 0], 8);
C("post-1", 1020, 48, [1150, 0, 610], [0, 0, 0], 8);
B("rope-span", [2300, 90, 90], [0, 0, 1050]);
C("center-clip", 120, 75, [0, 0, 1050], [0, 0, 0], 8);
B("base-inset-0", [250, 250, 60], [-1150, 0, 130]);
B("base-inset-1", [250, 250, 60], [1150, 0, 130]);

return p.model();
