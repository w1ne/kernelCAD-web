// Ticket vending kiosk: Self-service ticket terminal with a sheltered screen, receipt slot, and accessible-height controls.
meta({
  name: "ticket-vending-kiosk",
  license: "CC0-1.0",
  title: "Ticket vending kiosk",
  description: "Self-service ticket terminal with a sheltered screen, receipt slot, and accessible-height controls. Controls: overall scale, powderCoat, stainlessSteel, glass; festival and twilight material presets.",
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
const p = assembly("ticket-vending-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["pedestal", "side-return", "ticket-slot", "weather-hood"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["display", "screen-housing"].includes(name)) p.part(name, positioned.color(glass));
  else if (["foot-plate"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("pedestal", [520, 450, 1020], [0, 0, 510]);
B("screen-housing", [650, 135, 540], [0, -230, 1300]);
B("display", [430, 24, 300], [0, -309, 1360]);
B("weather-hood", [760, 390, 85], [0, -70, 1620]);
B("ticket-slot", [190, 38, 80], [0, -309, 1110]);
B("side-return", [310, 80, 55], [0, -310, 1000]);
B("foot-plate", [700, 590, 70], [0, 0, 35]);

return p.model();
