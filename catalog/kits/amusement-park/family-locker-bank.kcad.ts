// Family locker bank: Six-door day-use locker unit with recessed-looking door panels, toe kick, and numbered header strip.
meta({
  name: "family-locker-bank",
  license: "CC0-1.0",
  title: "Family locker bank",
  description: "Six-door day-use locker unit with recessed-looking door panels, toe kick, and numbered header strip. Controls: overall scale, powderCoat, stainlessSteel, polymer; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const polymer = param("polymer", "#586f7a", { label: "Molded polymer" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "polymer": "#7d9b93"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "polymer": "#455e83"
},
});
const originOffsetMm = 0;
const p = assembly("family-locker-bank");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["toe-kick", "top-header"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["locker-door-0", "locker-door-1", "locker-door-2", "locker-door-3", "locker-door-4", "locker-door-5", "locker-handle-0", "locker-handle-1", "locker-handle-2", "locker-handle-3", "locker-handle-4", "locker-handle-5"].includes(name)) p.part(name, positioned.color(polymer));
  else if (["locker-case"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("locker-case", [2300, 640, 1840], [0, 0, 920]);
B("toe-kick", [2330, 670, 130], [0, 0, 65]);
B("top-header", [2360, 700, 170], [0, 0, 1945]);
B("locker-door-0", [350, 35, 760], [-875, -340, 500]);
B("locker-door-1", [350, 35, 760], [0, -340, 500]);
B("locker-door-2", [350, 35, 760], [875, -340, 500]);
B("locker-door-3", [350, 35, 760], [-875, -340, 1350]);
B("locker-door-4", [350, 35, 760], [0, -340, 1350]);
B("locker-door-5", [350, 35, 760], [875, -340, 1350]);
B("locker-handle-0", [45, 50, 150], [-730, -385, 500]);
B("locker-handle-1", [45, 50, 150], [145, -385, 500]);
B("locker-handle-2", [45, 50, 150], [1020, -385, 500]);
B("locker-handle-3", [45, 50, 150], [-730, -385, 1350]);
B("locker-handle-4", [45, 50, 150], [145, -385, 1350]);
B("locker-handle-5", [45, 50, 150], [1020, -385, 1350]);

return p.model();
