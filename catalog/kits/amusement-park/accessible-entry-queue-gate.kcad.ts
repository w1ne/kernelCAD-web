// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "accessible-entry-queue-gate",
  license: "CC0-1.0",
  title: "Accessible entry queue gate",
  description: "Wide clear-opening gate with swing leaf, paired handrails, and a low threshold plate. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#69847d", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("accessible-entry-queue-gate");

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

B("threshold", [1850, 700, 50], [0, 0, 25]);
B("left-post", [100, 100, 1200], [-870, 0, 600]);
B("right-post", [100, 100, 1200], [870, 0, 600]);
B("swing-leaf", [70, 1500, 900], [650, 0, 520], [0, 0, -35]);
B("left-handrail", [1600, 70, 75], [-500, 250, 500]);
B("right-handrail", [1600, 70, 75], [500, -250, 500]);
B("operator-latch", [130, 100, 180], [795, 0, 1000]);

return p.model();
