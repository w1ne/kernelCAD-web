// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "ride-load-platform",
  license: "CC0-1.0",
  title: "Ride load platform",
  description: "Queue-side loading deck with three boarding bays, stairs, handrails, and a hinged-looking access gate. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78817c", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("ride-load-platform");

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

B("deck", [2800, 1450, 200], [0, 0, 760]);
B("stair-base", [1050, 780, 120], [0, -1180, 60]);
B("stair-step-0", [1050, 230, 90], [0, -1050, 120]);
B("stair-step-1", [1050, 230, 90], [0, -820, 230]);
B("stair-step-2", [1050, 230, 90], [0, -590, 340]);
B("stair-step-3", [1050, 230, 90], [0, -360, 450]);
B("stair-step-4", [1050, 230, 90], [0, -130, 560]);
B("stair-step-5", [1050, 230, 90], [0, 100, 670]);
B("rail-post-0", [75, 75, 820], [-1300, 510, 1170]);
B("rail-post-1", [75, 75, 820], [-450, 510, 1170]);
B("rail-post-2", [75, 75, 820], [450, 510, 1170]);
B("rail-post-3", [75, 75, 820], [1300, 510, 1170]);
B("rail-post-4", [75, 75, 820], [-1300, -430, 1170]);
B("rail-post-5", [75, 75, 820], [1300, -430, 1170]);
B("rear-handrail", [2700, 75, 85], [0, 510, 1540]);
B("side-handrail-left", [75, 940, 85], [-1300, 40, 1540]);
B("side-handrail-right", [75, 940, 85], [1300, 40, 1540]);
B("boarding-gate", [600, 60, 700], [0, -380, 1210]);

return p.model();
