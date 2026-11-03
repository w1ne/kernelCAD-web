// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "tea-cup-spinner-car",
  license: "CC0-1.0",
  title: "Tea cup spinner car",
  description: "Single round spinner tub with raised rim, seat bench, center grip, and a broad display base. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#9c7891", { label: "Asset color" });
const originOffsetMm = -55;
const p = assembly("tea-cup-spinner-car");

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

C("spinner-base", 110, 540, [0, 0, 55], [0, 0, 0], 14);
C("cup-body", 480, 420, [0, 0, 115], [0, 0, 0], 14);
C("cup-rim", 80, 475, [0, 0, 520], [0, 0, 0], 14);
C("center-grip", 470, 65, [0, 0, 575]);
B("seat-bench", [460, 180, 170], [0, -165, 330]);
B("cup-handle-0", [300, 75, 75], [450, 0, 390]);
B("cup-handle-1", [300, 75, 75], [-450, 0, 390]);
B("cup-handle-2", [300, 75, 75], [0, 450, 390]);
B("cup-handle-3", [300, 75, 75], [0, -450, 390]);

return p.model();
