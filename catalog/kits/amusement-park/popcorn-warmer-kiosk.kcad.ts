// Popcorn warmer kiosk: Countertop popcorn service kiosk with a tall warming case, serving shelf, and striped rain canopy.
meta({
  name: "popcorn-warmer-kiosk",
  license: "CC0-1.0",
  title: "Popcorn warmer kiosk",
  description: "Countertop popcorn service kiosk with a tall warming case, serving shelf, and striped rain canopy. Controls: overall scale, stainlessSteel, enamel, glass, canvas; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const enamel = param("enamel", "#efb62e", { label: "Baked enamel" });
const glass = param("glass", "#75b9bf", { label: "Tinted glass" });
const canvas = param("canvas", "#e0c98e", { label: "Canvas" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "enamel": "#edb34d",
    "glass": "#efce70",
    "canvas": "#eddaa9"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "enamel": "#385b81",
    "glass": "#6387aa",
    "canvas": "#a85e4f"
},
});
const originOffsetMm = 0;
const p = assembly("popcorn-warmer-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["case-post-0", "case-post-1", "case-post-2", "case-post-3", "counter", "warmer-base", "warming-case"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["awning", "awning-post-0", "awning-post-1", "awning-post-2", "awning-post-3", "awning-stripe-0", "awning-stripe-2", "awning-stripe-4"].includes(name)) p.part(name, positioned.color(canvas));
  else if (["glass-back", "glass-left", "glass-right"].includes(name)) p.part(name, positioned.color(glass));
  else if (["awning-stripe-1", "awning-stripe-3", "case-roof", "popcorn-kernel-0", "popcorn-kernel-1", "popcorn-kernel-2", "popcorn-kernel-3", "popcorn-kernel-4", "serving-shelf"].includes(name)) p.part(name, positioned.color(enamel));
  else p.part(name, positioned.color(stainlessSteel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("counter", [1550, 1050, 840], [0, 0, 420]);
B("warmer-base", [920, 740, 240], [0, -80, 960]);
B("case-roof", [1050, 850, 90], [0, -80, 2010]);
B("serving-shelf", [1820, 480, 120], [0, -420, 900]);
B("awning", [1950, 1300, 100], [0, 0, 2370]);
B("awning-post-0", [70, 70, 1250], [-870, 500, 1750]);
B("awning-post-1", [70, 70, 1250], [870, 500, 1750]);
B("awning-post-2", [70, 70, 1250], [-870, -500, 1750]);
B("awning-post-3", [70, 70, 1250], [870, -500, 1750]);

place("glass-back", box(800, 24, 710, true), [0, 294, 1530]);
place("glass-left", box(24, 650, 710, true), [-448, -80, 1530]);
place("glass-right", box(24, 650, 710, true), [448, -80, 1530]);
place("warming-tray", box(760, 610, 40, true), [0, -80, 1100]);
place("case-post-0", box(35, 35, 900, true), [-442, -420, 1530]);
place("case-post-1", box(35, 35, 900, true), [442, -420, 1530]);
place("case-post-2", box(35, 35, 900, true), [-442, 260, 1530]);
place("case-post-3", box(35, 35, 900, true), [442, 260, 1530]);
place("popcorn-kernel-0", sphere(105), [-170, -80, 1200]);
place("popcorn-kernel-1", sphere(105), [0, -80, 1200]);
place("popcorn-kernel-2", sphere(105), [170, -80, 1200]);
place("popcorn-kernel-3", sphere(95), [-85, -80, 1360]);
place("popcorn-kernel-4", sphere(95), [85, -80, 1360]);
place("awning-stripe-0", box(260, 1300, 16, true), [-780, 0, 2420]);
place("awning-stripe-1", box(260, 1300, 16, true), [-390, 0, 2420]);
place("awning-stripe-2", box(260, 1300, 16, true), [0, 0, 2420]);
place("awning-stripe-3", box(260, 1300, 16, true), [390, 0, 2420]);
place("awning-stripe-4", box(260, 1300, 16, true), [780, 0, 2420]);

return p.model();
