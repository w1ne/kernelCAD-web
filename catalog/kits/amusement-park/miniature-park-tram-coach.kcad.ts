// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "miniature-park-tram-coach",
  license: "CC0-1.0",
  title: "Miniature park tram coach",
  description: "Open-air visitor train coach with paired bench rows, side step, canopy roof, and four rail wheels. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#7b9280", { label: "Asset color" });
const originOffsetMm = 0;
const p = assembly("miniature-park-tram-coach");

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

B("underframe", [1850, 820, 200], [0, 0, 330]);
B("floor", [1760, 780, 110], [0, 0, 480]);
B("canopy-roof", [1980, 1040, 110], [0, 0, 1640]);
B("canopy-post-0", [75, 75, 1050], [-850, -350, 1070]);
B("canopy-post-1", [75, 75, 1050], [850, -350, 1070]);
B("canopy-post-2", [75, 75, 1050], [-850, 350, 1070]);
B("canopy-post-3", [75, 75, 1050], [850, 350, 1070]);
B("bench-0", [650, 220, 210], [-450, -210, 760]);
B("bench-1", [650, 220, 210], [450, -210, 760]);
B("bench-2", [650, 220, 210], [-450, 210, 760]);
B("bench-3", [650, 220, 210], [450, 210, 760]);
C("wheel-0", 90, 230, [-610, -430, 230], [90, 0, 0], 10);
C("wheel-1", 90, 230, [610, -430, 230], [90, 0, 0], 10);
C("wheel-2", 90, 230, [-610, 430, 230], [90, 0, 0], 10);
C("wheel-3", 90, 230, [610, 430, 230], [90, 0, 0], 10);

return p.model();
