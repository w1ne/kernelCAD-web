// Admission turnstile bank: Three waist-high admission gates with rotating arms and a shared approach rail.
meta({
  name: "admission-turnstile-bank",
  license: "CC0-1.0",
  title: "Admission turnstile bank",
  description: "Three waist-high admission gates with rotating arms and a shared approach rail. Controls: overall scale, stainlessSteel, anodizedAluminum, polymer; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const anodizedAluminum = param("anodizedAluminum", "#859b9e", { label: "Anodized aluminum" });
const polymer = param("polymer", "#586f7a", { label: "Molded polymer" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "anodizedAluminum": "#b7c4c3",
    "polymer": "#7d9b93"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "anodizedAluminum": "#576f78",
    "polymer": "#455e83"
},
});
const originOffsetMm = 0;
const p = assembly("admission-turnstile-bank");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["pedestal-0", "pedestal-1", "pedestal-2"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["reader-0", "reader-1", "reader-2", "turnstile-arm-0-0", "turnstile-arm-0-1", "turnstile-arm-0-2", "turnstile-arm-1-0", "turnstile-arm-1-1", "turnstile-arm-1-2", "turnstile-arm-2-0", "turnstile-arm-2-1", "turnstile-arm-2-2"].includes(name)) p.part(name, positioned.color(polymer));
  else if (["approach-rail-front", "approach-rail-rear"].includes(name)) p.part(name, positioned.color(anodizedAluminum));
  else p.part(name, positioned.color(stainlessSteel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("approach-rail-front", [2200, 55, 900], [0, -520, 450]);
B("approach-rail-rear", [2200, 55, 900], [0, 520, 450]);
B("pedestal-0", [220, 260, 920], [-700, 0, 460]);
B("pedestal-1", [220, 260, 920], [0, 0, 460]);
B("pedestal-2", [220, 260, 920], [700, 0, 460]);
B("turnstile-arm-0-0", [460, 42, 42], [-700, 0, 500], [0, 0, 0]);
B("turnstile-arm-0-1", [460, 42, 42], [-700, 0, 500], [0, 0, 120]);
B("turnstile-arm-0-2", [460, 42, 42], [-700, 0, 500], [0, 0, 240]);
B("turnstile-arm-1-0", [460, 42, 42], [0, 0, 500], [0, 0, 0]);
B("turnstile-arm-1-1", [460, 42, 42], [0, 0, 500], [0, 0, 120]);
B("turnstile-arm-1-2", [460, 42, 42], [0, 0, 500], [0, 0, 240]);
B("turnstile-arm-2-0", [460, 42, 42], [700, 0, 500], [0, 0, 0]);
B("turnstile-arm-2-1", [460, 42, 42], [700, 0, 500], [0, 0, 120]);
B("turnstile-arm-2-2", [460, 42, 42], [700, 0, 500], [0, 0, 240]);
B("reader-0", [160, 120, 95], [-700, -20, 965]);
B("reader-1", [160, 120, 95], [0, -20, 965]);
B("reader-2", [160, 120, 95], [700, -20, 965]);

return p.model();
