// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "balloon-dart-gallery",
  license: "CC0-1.0",
  title: "Balloon dart gallery",
  description: "Counter-height dart game with a pegged balloon wall, side dividers, and an overhead net frame. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#aa7d69", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("balloon-dart-gallery");

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

B("backboard", [1950, 120, 1380], [0, 450, 1090]);
B("counter", [2100, 780, 170], [0, 0, 820]);
S("balloon-0", 115, [-700, 360, 700]);
S("balloon-1", 115, [-350, 360, 920]);
S("balloon-2", 115, [0, 360, 690]);
S("balloon-3", 115, [350, 360, 930]);
S("balloon-4", 115, [700, 360, 710]);
S("balloon-5", 115, [-525, 360, 1190]);
S("balloon-6", 115, [175, 360, 1180]);
S("balloon-7", 115, [560, 360, 1120]);
B("side-divider-0", [100, 1120, 1500], [-1070, 370, 750]);
B("side-divider-1", [100, 1120, 1500], [1070, 370, 750]);
B("net-post-0", [70, 70, 2200], [-1050, 430, 1100]);
B("net-post-1", [70, 70, 2200], [1050, 430, 1100]);
B("net-post-2", [70, 70, 2200], [-1050, -500, 1100]);
B("net-post-3", [70, 70, 2200], [1050, -500, 1100]);
B("net-header", [2200, 1050, 80], [0, 0, 2220]);

return p.model();
