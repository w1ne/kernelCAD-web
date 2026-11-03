// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "entrance-photo-frame",
  license: "CC0-1.0",
  title: "Entrance photo frame",
  description: "Freestanding family photo portal with a broad top beam, side plinths, and a camera-marked crest. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#d9a657", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("entrance-photo-frame");

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

B("left-plinth", [260, 300, 1600], [-930, 0, 800]);
B("right-plinth", [260, 300, 1600], [930, 0, 800]);
B("photo-beam", [2100, 340, 230], [0, 0, 1650]);
B("top-cap", [2350, 560, 115], [0, 0, 1820]);
C("camera-emblem", 90, 160, [0, -190, 1680], [90, 0, 0], 12);
B("frame-accent-0", [90, 120, 980], [-770, -25, 800]);
B("frame-accent-1", [90, 120, 980], [770, -25, 800]);

return p.model();
