// Family plaza shade pavilion: Four-post plaza shelter with two gently pitched canopy panels and a raised ridge mast.
meta({
  name: "family-plaza-shade-pavilion",
  license: "CC0-1.0",
  title: "Family plaza shade pavilion",
  description: "Four-post plaza shelter with two gently pitched canopy panels and a raised ridge mast. Controls: overall scale, steel, canvas, concrete; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#738087", { label: "Painted steel" });
const canvas = param("canvas", "#e0c98e", { label: "Canvas" });
const concrete = param("concrete", "#92938b", { label: "Concrete" });

presets({
  festival: {
    "steel": "#9da3a0",
    "canvas": "#eddaa9",
    "concrete": "#aaa99e"
},
  twilight: {
    "steel": "#4f626c",
    "canvas": "#a85e4f",
    "concrete": "#6f7477"
},
});
const originOffsetMm = 0;
const p = assembly("family-plaza-shade-pavilion");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["canopy-panel-left", "canopy-panel-right"].includes(name)) p.part(name, positioned.color(steel));
  else if (["anchor-foot-0", "anchor-foot-1", "anchor-foot-2", "anchor-foot-3"].includes(name)) p.part(name, positioned.color(concrete));
  else if (["center-mast", "corner-post-0", "corner-post-1", "corner-post-2", "corner-post-3"].includes(name)) p.part(name, positioned.color(canvas));
  else p.part(name, positioned.color(steel));
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

B("corner-post-0", [105, 105, 2650], [-1450, -1050, 1325]);
B("corner-post-1", [105, 105, 2650], [1450, -1050, 1325]);
B("corner-post-2", [105, 105, 2650], [-1450, 1050, 1325]);
B("corner-post-3", [105, 105, 2650], [1450, 1050, 1325]);
B("center-mast", [140, 140, 3100], [0, 0, 1550]);
B("canopy-panel-left", [1830, 2440, 105], [-720, 0, 2830], [0, -8, 0]);
B("canopy-panel-right", [1830, 2440, 105], [720, 0, 2830], [0, 8, 0]);
C("anchor-foot-0", 80, 220, [-1450, -1050, 40]);
C("anchor-foot-1", 80, 220, [1450, -1050, 40]);
C("anchor-foot-2", 80, 220, [-1450, 1050, 40]);
C("anchor-foot-3", 80, 220, [1450, 1050, 40]);

return p.model();
