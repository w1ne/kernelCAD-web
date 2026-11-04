// Pretzel warmer counter: Warm pretzel display with two-tier glass case, condiment niche, service shelf, and cash drawer.
meta({
  name: "pretzel-warmer-counter",
  license: "CC0-1.0",
  title: "Pretzel warmer counter",
  description: "Warm pretzel display with two-tier glass case, condiment niche, service shelf, and cash drawer. Controls: overall scale, stainlessSteel, enamel, glass; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });
const glass = param("glass", "#75b9bf", { label: "Tinted glass" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "enamel": "#edb34d",
    "glass": "#efce70"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "enamel": "#385b81",
    "glass": "#6387aa"
},
});
const originOffsetMm = 0;
const p = assembly("pretzel-warmer-counter");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["condiment-cubby", "counter-body"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["display-base", "display-shelf", "glass-case-back", "glass-case-front", "glass-case-top"].includes(name)) p.part(name, positioned.color(glass));
  else if (["cash-drawer"].includes(name)) p.part(name, positioned.color(enamel));
  else p.part(name, positioned.color(stainlessSteel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("counter-body", [1640, 820, 790], [0, 0, 395]);
B("display-base", [1380, 620, 150], [0, -40, 870]);
B("glass-case-back", [1300, 70, 700], [0, 220, 1280]);
B("glass-case-top", [1380, 640, 75], [0, 0, 1640]);
B("glass-case-front", [1300, 70, 700], [0, -285, 1280]);
B("display-shelf", [1260, 520, 65], [0, 0, 1230]);
B("condiment-cubby", [420, 390, 360], [500, -410, 1040]);
B("cash-drawer", [520, 430, 100], [-460, -200, 850]);

return p.model();
