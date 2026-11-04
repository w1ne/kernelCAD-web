// Miniature park tram coach: Open-air visitor train coach with paired bench rows, side step, canopy roof, and four rail wheels.
meta({
  name: "miniature-park-tram-coach",
  license: "CC0-1.0",
  title: "Miniature park tram coach",
  description: "Open-air visitor train coach with paired bench rows, side step, canopy roof, and four rail wheels. Controls: overall scale, enamel, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "enamel": "#edb34d",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "enamel": "#385b81",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("miniature-park-tram-coach");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["bench-0", "bench-1", "bench-2", "bench-3", "canopy-roof", "floor"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["wheel-0", "wheel-1", "wheel-2", "wheel-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["canopy-post-0", "canopy-post-1", "canopy-post-2", "canopy-post-3", "underframe"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(enamel));
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
