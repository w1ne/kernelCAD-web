// Water race game lane: Two-player midway race fixture with parallel troughs, pump handles, and a raised finish marker.
meta({
  name: "water-race-game-lane",
  license: "CC0-1.0",
  title: "Water race game lane",
  description: "Two-player midway race fixture with parallel troughs, pump handles, and a raised finish marker. Controls: overall scale, fiberglass, stainlessSteel, acrylic; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });

presets({
  festival: {
    "fiberglass": "#d7a83f",
    "stainlessSteel": "#d1d1c6",
    "acrylic": "#79c8d2"
},
  twilight: {
    "fiberglass": "#96566d",
    "stainlessSteel": "#788b91",
    "acrylic": "#41768b"
},
});
const originOffsetMm = 0;
const p = assembly("water-race-game-lane");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["base", "race-trough-0", "race-trough-1"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["race-ball-0", "race-ball-1"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["finish-bar", "finish-post-left", "finish-post-right", "pump-handle-0", "pump-handle-1"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(fiberglass));
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
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

B("base", [2360, 940, 140], [0, 0, 70]);
B("race-trough-0", [1900, 320, 270], [0, -245, 270]);
B("race-trough-1", [1900, 320, 270], [0, 245, 270]);
C("pump-handle-0", 450, 36, [-650, -245, 410], [0, 0, 0], 8);
C("pump-handle-1", 450, 36, [-650, 245, 410], [0, 0, 0], 8);
S("race-ball-0", 75, [600, -245, 450]);
S("race-ball-1", 75, [600, 245, 450]);
B("finish-post-left", [90, 90, 790], [980, -430, 395]);
B("finish-post-right", [90, 90, 790], [980, 430, 395]);
B("finish-bar", [160, 940, 100], [980, 0, 790]);

return p.model();
