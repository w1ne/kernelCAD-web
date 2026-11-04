// Funnel cake kiosk: Fair-food fry stand with a vent hood, serving pass, fryer tub silhouette, and side-order shelf.
meta({
  name: "funnel-cake-kiosk",
  license: "CC0-1.0",
  title: "Funnel cake kiosk",
  description: "Fair-food fry stand with a vent hood, serving pass, fryer tub silhouette, and side-order shelf. Controls: overall scale, stainlessSteel, enamel, powderCoat; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "enamel": "#edb34d",
    "powderCoat": "#d47452"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "enamel": "#385b81",
    "powderCoat": "#35576f"
},
});
const originOffsetMm = 0;
const p = assembly("funnel-cake-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["fryer-casing", "fryer-vat", "hood", "kiosk-base", "service-pass", "vent-riser"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["queue-counter"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["side-shelf"].includes(name)) p.part(name, positioned.color(enamel));
  else p.part(name, positioned.color(stainlessSteel));
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

B("kiosk-base", [1750, 1250, 920], [0, 0, 460]);
B("service-pass", [1360, 160, 560], [0, -650, 1080]);
B("fryer-casing", [620, 620, 530], [-430, 0, 1200]);
C("fryer-vat", 190, 250, [-430, 0, 1480], [0, 0, 0], 12);
B("vent-riser", [620, 510, 620], [430, 300, 1540]);
B("hood", [1060, 960, 150], [430, 250, 1900]);
B("side-shelf", [520, 750, 120], [1080, 100, 1020]);
B("queue-counter", [1880, 350, 140], [0, -680, 700]);

return p.model();
