// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "log-flume-boat",
  license: "CC0-1.0",
  title: "Log flume boat",
  description: "Two-seat flume boat with raised bow, open seating well, rear grab bar, and keel-like lower profile. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#79917f", { label: "Asset color" });
const originOffsetMm = -95;
const p = assembly("log-flume-boat");

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

B("keel", [1760, 560, 170], [0, 0, 180]);
B("hull", [2080, 1040, 390], [0, 0, 420], [0, -7, 0]);
B("bow-cap", [450, 1040, 210], [940, 0, 690], [0, -18, 0]);
B("seat-front", [150, 850, 240], [400, 0, 790]);
B("seat-rear", [150, 850, 240], [-420, 0, 790]);
B("grab-bar", [95, 850, 95], [-820, 0, 1100]);
B("foot-well", [650, 520, 90], [0, 0, 680]);

return p.model();
