// Ride photo preview kiosk: Guest-facing image preview station with a large display, purchase ledge, and a tilted sun shield.
meta({
  name: "ride-photo-preview-kiosk",
  license: "CC0-1.0",
  title: "Ride photo preview kiosk",
  description: "Guest-facing image preview station with a large display, purchase ledge, and a tilted sun shield. Controls: overall scale, powderCoat, stainlessSteel, glass; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const glass = param("glass", "#75b9bf", { label: "Tinted glass" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "glass": "#efce70"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "glass": "#6387aa"
},
});
const originOffsetMm = 0;
const p = assembly("ride-photo-preview-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["pedestal", "purchase-ledge", "receipt-slot", "sun-shield"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["display-face", "display-frame"].includes(name)) p.part(name, positioned.color(glass));
  else if (["base"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base", [650, 580, 160], [0, 0, 80]);
B("pedestal", [440, 400, 970], [0, 0, 645]);
B("display-frame", [1080, 170, 900], [0, -110, 1550]);
B("display-face", [850, 32, 660], [0, -211, 1550]);
B("purchase-ledge", [1060, 380, 110], [0, -170, 1080]);
B("sun-shield", [1250, 520, 100], [0, -20, 2070], [-8, 0, 0]);
B("receipt-slot", [210, 30, 70], [0, -218, 1120]);

return p.model();
