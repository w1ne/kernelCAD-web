// Log flume boat: Two-seat flume boat with raised bow, open seating well, rear grab bar, and keel-like lower profile.
meta({
  name: "log-flume-boat",
  license: "CC0-1.0",
  title: "Log flume boat",
  description: "Two-seat flume boat with raised bow, open seating well, rear grab bar, and keel-like lower profile. Controls: overall scale, fiberglass, stainlessSteel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "fiberglass": "#d7a83f",
    "stainlessSteel": "#d1d1c6",
    "rubber": "#3c4245"
},
  twilight: {
    "fiberglass": "#96566d",
    "stainlessSteel": "#788b91",
    "rubber": "#20262a"
},
});
const originOffsetMm = -95;
const p = assembly("log-flume-boat");

const boatHull = (length: number, width: number, height: number) =>
  path().moveTo(-length / 2, -height / 2).lineTo(length / 2, -height / 2)
    .lineTo(length / 2, -height * 0.12).lineTo(length * 0.68, height / 2)
    .lineTo(-length * 0.68, height / 2).lineTo(-length / 2, -height * 0.12).close()
    .extrude(width).rotate([1, 0, 0], 90).translate(0, width / 2, 0);

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["bow-cap", "hull", "seat-front", "seat-rear"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["foot-well"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["grab-bar", "keel"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(fiberglass));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("keel", [1760, 560, 170], [0, 0, 180]);
place("hull", boatHull(2080, 1040, 390).rotate([0, 1, 0], -7), [0, 0, 420]);
B("bow-cap", [450, 1040, 210], [940, 0, 690], [0, -18, 0]);
B("seat-front", [150, 850, 240], [400, 0, 790]);
B("seat-rear", [150, 850, 240], [-420, 0, 790]);
B("grab-bar", [95, 850, 95], [-820, 0, 1100]);
B("foot-well", [650, 520, 90], [0, 0, 680]);

return p.model();
