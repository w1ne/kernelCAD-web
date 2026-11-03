// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "park-stroller",
  license: "CC0-1.0",
  title: "Park stroller",
  description: "Single-seat visitor stroller with folding canopy, push handle, footrest, and paired wheels. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#688b89", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("park-stroller");

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

B("seat-pan", [520, 620, 100], [0, 0, 700]);
B("backrest", [520, 100, 720], [0, 210, 1080], [-12, 0, 0]);
B("footrest", [390, 250, 70], [0, -300, 430]);
B("canopy-rib", [60, 670, 65], [0, 160, 1510], [18, 0, 0]);
B("canopy", [570, 720, 85], [0, 170, 1510], [18, 0, 0]);
B("push-handle", [680, 65, 65], [0, 500, 1430]);
C("wheel-0", 70, 205, [-360, -20, 205], [0, 90, 0], 12);
C("wheel-1", 70, 205, [360, -20, 205], [0, 90, 0], 12);
B("frame-leg-0", [55, 55, 700], [-300, 0, 500], [-15, 0, 0]);
B("frame-leg-1", [55, 55, 700], [300, 0, 500], [-15, 0, 0]);
B("frame-leg-2", [55, 55, 700], [-260, 260, 500], [25, 0, 0]);
B("frame-leg-3", [55, 55, 700], [260, 260, 500], [25, 0, 0]);

return p.model();
