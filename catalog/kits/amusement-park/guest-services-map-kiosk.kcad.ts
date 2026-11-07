// Guest services map kiosk: Covered information stand with a large park map panel and a low shelf for printed guides.
meta({
  name: "guest-services-map-kiosk",
  license: "CC0-1.0",
  title: "Guest services map kiosk",
  description: "Covered information stand with a large park map panel and a low shelf for printed guides. Controls: overall scale, paintedTimber, stainlessSteel, acrylic; festival and twilight material presets.",
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
const p = assembly("guest-services-map-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["base", "shelter-roof"].includes(name)) p.part(name, positioned.color(paintedTimber));
  else if (["map-panel"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["guide-shelf", "map-frame-bottom", "map-frame-top", "support-post"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(paintedTimber));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base", [780, 620, 140], [0, 0, 70]);
B("support-post", [120, 130, 1460], [0, 90, 870]);
B("map-panel", [1320, 150, 920], [0, -20, 1900]);
B("map-frame-top", [1430, 205, 100], [0, -35, 2410]);
B("map-frame-bottom", [1430, 205, 100], [0, -35, 1390]);
B("guide-shelf", [1100, 430, 85], [0, -300, 970]);
B("shelter-roof", [1640, 920, 120], [0, 50, 2540]);

return p.model();
