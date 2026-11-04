// Playground climber: Small family-zone climbing frame with a raised platform, ladder rungs, crawl-through opening, and slide.
meta({
  name: "playground-climber",
  license: "CC0-1.0",
  title: "Playground climber",
  description: "Small family-zone climbing frame with a raised platform, ladder rungs, crawl-through opening, and slide. Controls: overall scale, powderCoat, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "powderCoat": "#35576f",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("playground-climber");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["platform", "slide-bed"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["slide-rail-1"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["ladder-rung-0", "ladder-rung-1", "ladder-rung-2", "ladder-rung-3", "ladder-rung-4", "platform-post-0", "platform-post-1", "platform-post-2", "platform-post-3", "slide-rail-0"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("platform", [880, 820, 110], [0, 0, 1120]);
B("platform-post-0", [95, 95, 1120], [-350, -300, 560]);
B("platform-post-1", [95, 95, 1120], [350, -300, 560]);
B("platform-post-2", [95, 95, 1120], [-350, 300, 560]);
B("platform-post-3", [95, 95, 1120], [350, 300, 560]);
B("ladder-rung-0", [580, 75, 70], [0, -370, 250]);
B("ladder-rung-1", [580, 75, 70], [0, -370, 440]);
B("ladder-rung-2", [580, 75, 70], [0, -370, 630]);
B("ladder-rung-3", [580, 75, 70], [0, -370, 820]);
B("ladder-rung-4", [580, 75, 70], [0, -370, 1010]);
B("slide-bed", [520, 1340, 100], [0, 1040, 510], [-24, 0, 0]);
B("slide-rail-0", [80, 1380, 250], [-290, 1040, 590], [-24, 0, 0]);
B("slide-rail-1", [80, 1380, 250], [290, 1040, 590], [-24, 0, 0]);

return p.model();
