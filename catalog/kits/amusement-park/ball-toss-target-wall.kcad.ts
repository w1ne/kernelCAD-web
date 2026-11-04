// Ball toss target wall: Three-bay beanbag toss stand with stepped target openings, side braces, and a front counter shelf.
meta({
  name: "ball-toss-target-wall",
  license: "CC0-1.0",
  title: "Ball toss target wall",
  description: "Three-bay beanbag toss stand with stepped target openings, side braces, and a front counter shelf. Controls: overall scale, paintedTimber, steel, enamel; festival and twilight material presets.",
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
const p = assembly("ball-toss-target-wall");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["backboard", "side-left", "side-right"].includes(name)) p.part(name, positioned.color(paintedTimber));
  else if (["target-ring-0", "target-ring-1", "target-ring-2"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["base-foot", "counter-shelf"].includes(name)) p.part(name, positioned.color(steel));
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

B("backboard", [1880, 160, 1450], [0, 450, 900]);
B("side-left", [170, 1000, 1330], [-950, 0, 800], [0, 0, 3]);
B("side-right", [170, 1000, 1330], [950, 0, 800], [0, 0, -3]);
B("counter-shelf", [2050, 500, 130], [0, -250, 620]);
C("target-ring-0", 75, 175, [-550, 330, 780], [90, 0, 0], 10);
C("target-ring-1", 75, 175, [0, 330, 1160], [90, 0, 0], 10);
C("target-ring-2", 75, 175, [550, 330, 780], [90, 0, 0], 10);
B("base-foot", [2150, 940, 130], [0, 0, 65]);

return p.model();
