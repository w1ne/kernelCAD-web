// Wristband check-in desk: Guest check-in counter with wristband dispenser, handheld scanner cradle, and an accessible return shelf.
meta({
  name: "wristband-checkin-desk",
  license: "CC0-1.0",
  title: "Wristband check-in desk",
  description: "Guest check-in counter with wristband dispenser, handheld scanner cradle, and an accessible return shelf. Controls: overall scale, paintedTimber, stainlessSteel, acrylic; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const paintedTimber = param("paintedTimber", "#92704e", { label: "Painted timber" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });

presets({
  festival: {
    "paintedTimber": "#be8a4e",
    "stainlessSteel": "#d1d1c6",
    "acrylic": "#79c8d2"
},
  twilight: {
    "paintedTimber": "#5e7181",
    "stainlessSteel": "#788b91",
    "acrylic": "#41768b"
},
});
const originOffsetMm = 0;
const p = assembly("wristband-checkin-desk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["counter-body", "countertop", "wristband-dispenser"].includes(name)) p.part(name, positioned.color(paintedTimber));
  else if (["privacy-screen"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["lower-return-shelf", "scanner-cradle"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(paintedTimber));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("counter-body", [1800, 760, 850], [0, 0, 425]);
B("countertop", [1900, 850, 100], [0, 0, 900]);
B("wristband-dispenser", [340, 310, 420], [-570, -60, 1160]);
B("scanner-cradle", [270, 300, 240], [470, -110, 1070], [-14, 0, 0]);
B("privacy-screen", [1350, 45, 420], [0, 340, 1170]);
B("lower-return-shelf", [1100, 340, 80], [0, -90, 200]);

return p.model();
