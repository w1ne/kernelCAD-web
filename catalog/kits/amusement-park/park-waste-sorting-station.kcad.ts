// Park waste sorting station: Three-stream visitor waste point with distinct lid openings, a shared roof, and a trolley-clear front.
meta({
  name: "park-waste-sorting-station",
  license: "CC0-1.0",
  title: "Park waste sorting station",
  description: "Three-stream visitor waste point with distinct lid openings, a shared roof, and a trolley-clear front. Controls: overall scale, powderCoat, stainlessSteel, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "enamel": "#edb34d"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "enamel": "#385b81"
},
});
const originOffsetMm = 0;
const p = assembly("park-waste-sorting-station");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["shared-canopy"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["bin-0", "bin-1", "bin-2", "lid-0", "lid-1", "lid-2"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["opening-rim-0", "opening-rim-1", "opening-rim-2", "support-0", "support-1"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
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

B("bin-0", [620, 620, 920], [-700, 0, 460]);
B("bin-1", [620, 620, 920], [0, 0, 460]);
B("bin-2", [620, 620, 920], [700, 0, 460]);
B("lid-0", [650, 650, 95], [-700, 0, 970]);
B("lid-1", [650, 650, 95], [0, 0, 970]);
B("lid-2", [650, 650, 95], [700, 0, 970]);
C("opening-rim-0", 45, 150, [-700, -10, 1030]);
C("opening-rim-1", 45, 150, [0, -10, 1030]);
C("opening-rim-2", 45, 150, [700, -10, 1030]);
B("shared-canopy", [2250, 850, 100], [0, 0, 1620]);
B("support-0", [75, 75, 580], [-1050, 330, 1320]);
B("support-1", [75, 75, 580], [1050, 330, 1320]);

return p.model();
