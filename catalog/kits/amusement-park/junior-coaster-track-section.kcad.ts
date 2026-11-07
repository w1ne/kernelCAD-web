// Junior coaster track section: Short display section of family coaster rail with cross ties, two supports, and a gentle rise.
meta({
  name: "junior-coaster-track-section",
  license: "CC0-1.0",
  title: "Junior coaster track section",
  description: "Short display section of family coaster rail with cross ties, two supports, and a gentle rise. Controls: overall scale, steel, timber, concrete; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#738087", { label: "Painted steel" });
const timber = param("timber", "#8a6748", { label: "Sealed timber" });
const concrete = param("concrete", "#92938b", { label: "Concrete" });

presets({
  festival: {
    "steel": "#9da3a0",
    "timber": "#ab8051",
    "concrete": "#aaa99e"
},
  twilight: {
    "steel": "#4f626c",
    "timber": "#604b3b",
    "concrete": "#6f7477"
},
});
const originOffsetMm = 10;
const p = assembly("junior-coaster-track-section");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if ([].includes(name)) p.part(name, positioned.color(steel));
  else if (["base-foot"].includes(name)) p.part(name, positioned.color(concrete));
  else if (["cross-tie-0", "cross-tie-1", "cross-tie-2", "cross-tie-3", "cross-tie-4", "cross-tie-5", "rail-0", "rail-1", "support-0", "support-1", "support-2"].includes(name)) p.part(name, positioned.color(timber));
  else p.part(name, positioned.color(steel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("rail-0", [3400, 95, 90], [0, -360, 670], [0, -12, 0]);
B("rail-1", [3400, 95, 90], [0, 360, 740], [0, -12, 0]);
B("cross-tie-0", [130, 840, 90], [-1450, 0, 590]);
B("cross-tie-1", [130, 840, 90], [-870, 0, 617]);
B("cross-tie-2", [130, 840, 90], [-290, 0, 644]);
B("cross-tie-3", [130, 840, 90], [290, 0, 671]);
B("cross-tie-4", [130, 840, 90], [870, 0, 698]);
B("cross-tie-5", [130, 840, 90], [1450, 0, 725]);
B("support-0", [100, 100, 620], [-1200, 0, 300]);
B("support-1", [100, 100, 690], [0, 0, 335]);
B("support-2", [100, 100, 760], [1200, 0, 370]);
B("base-foot", [3600, 1020, 65], [0, 0, 32]);

return p.model();
