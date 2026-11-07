// Ring toss game counter: Midway toss booth with a raised bottle rack, counter ledge, and a high striped canopy frame.
meta({
  name: "ring-toss-game-counter",
  license: "CC0-1.0",
  title: "Ring toss game counter",
  description: "Midway toss booth with a raised bottle rack, counter ledge, and a high striped canopy frame. Controls: overall scale, paintedTimber, steel, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#92704e", { label: "Painted timber" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "paintedTimber": "#be8a4e",
    "steel": "#9da3a0",
    "enamel": "#edb34d"
},
  twilight: {
    "paintedTimber": "#5e7181",
    "steel": "#4f626c",
    "enamel": "#385b81"
},
});
const originOffsetMm = 0;
const p = assembly("ring-toss-game-counter");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["canopy", "counter", "front-ledge"].includes(name)) p.part(name, positioned.color(paintedTimber));
  else if (["target-bottle-0", "target-bottle-1", "target-bottle-2", "target-bottle-3", "target-bottle-4"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["canopy-post-0", "canopy-post-1", "canopy-post-2", "canopy-post-3"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(paintedTimber));
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

B("counter", [1900, 660, 880], [0, 0, 440]);
B("front-ledge", [2020, 140, 130], [0, -385, 920]);
C("target-bottle-0", 370, 75, [-650, 70, 1080], [0, 0, 0], 8);
C("target-bottle-1", 370, 75, [-325, 70, 1080], [0, 0, 0], 8);
C("target-bottle-2", 370, 75, [0, 70, 1080], [0, 0, 0], 8);
C("target-bottle-3", 370, 75, [325, 70, 1080], [0, 0, 0], 8);
C("target-bottle-4", 370, 75, [650, 70, 1080], [0, 0, 0], 8);
B("canopy-post-0", [70, 70, 1120], [-920, 250, 1480]);
B("canopy-post-1", [70, 70, 1120], [920, 250, 1480]);
B("canopy-post-2", [70, 70, 1120], [-920, -250, 1480]);
B("canopy-post-3", [70, 70, 1120], [920, -250, 1480]);
B("canopy", [2200, 820, 100], [0, 0, 2070]);

return p.model();
