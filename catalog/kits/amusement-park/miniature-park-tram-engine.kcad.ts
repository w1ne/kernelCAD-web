// Miniature park tram engine: Low-speed park railway locomotive with an open cab, front buffer, boiler hood, and four wheels.
meta({
  name: "miniature-park-tram-engine",
  license: "CC0-1.0",
  title: "Miniature park tram engine",
  description: "Low-speed park railway locomotive with an open cab, front buffer, boiler hood, and four wheels. Controls: overall scale, enamel, steel, rubber; festival and twilight material presets.",
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
const p = assembly("miniature-park-tram-engine");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["cab-back", "cab-floor", "cab-roof", "smokestack"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["front-buffer", "wheel-0", "wheel-1", "wheel-2", "wheel-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["boiler", "chassis"].includes(name)) p.part(name, positioned.color(steel));
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

B("chassis", [1760, 770, 230], [0, 0, 360]);
B("cab-floor", [650, 720, 140], [-470, 0, 620]);
B("cab-back", [85, 720, 970], [-760, 0, 1120]);
B("cab-roof", [760, 850, 105], [-480, 0, 1630]);
C("boiler", 880, 290, [430, 0, 480], [0, 90, 0], 12);
C("smokestack", 330, 110, [700, 0, 920]);
B("front-buffer", [170, 920, 180], [1010, 0, 230]);
C("wheel-0", 95, 250, [-520, -420, 250], [90, 0, 0], 10);
C("wheel-1", 95, 250, [520, -420, 250], [90, 0, 0], 10);
C("wheel-2", 95, 250, [-520, 420, 250], [90, 0, 0], 10);
C("wheel-3", 95, 250, [520, 420, 250], [90, 0, 0], 10);

return p.model();
