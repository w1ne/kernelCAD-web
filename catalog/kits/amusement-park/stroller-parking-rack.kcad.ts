// Stroller parking rack: Queue-side stroller corral with numbered bays, wheel stops, and a clear central aisle.
meta({
  name: "stroller-parking-rack",
  license: "CC0-1.0",
  title: "Stroller parking rack",
  description: "Queue-side stroller corral with numbered bays, wheel stops, and a clear central aisle. Controls: overall scale, powderCoat, stainlessSteel, acrylic; festival and twilight material presets.",
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
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "acrylic": "#79c8d2"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "acrylic": "#41768b"
},
});
const originOffsetMm = 0;
const p = assembly("stroller-parking-rack");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["bay-divider-0", "bay-divider-1", "bay-divider-2", "bay-divider-3", "bay-divider-4", "bay-number-plate-0", "bay-number-plate-1", "bay-number-plate-2", "bay-number-plate-3", "bay-number-plate-4"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["entry-side-rail"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["base-rail-back", "base-rail-front"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base-rail-front", [2500, 70, 75], [0, -430, 38]);
B("base-rail-back", [2500, 70, 75], [0, 430, 38]);
B("bay-divider-0", [65, 850, 900], [-1000, 0, 450]);
B("bay-divider-1", [65, 850, 900], [-500, 0, 450]);
B("bay-divider-2", [65, 850, 900], [0, 0, 450]);
B("bay-divider-3", [65, 850, 900], [500, 0, 450]);
B("bay-divider-4", [65, 850, 900], [1000, 0, 450]);
B("bay-number-plate-0", [210, 40, 160], [-1000, -460, 1020]);
B("bay-number-plate-1", [210, 40, 160], [-500, -460, 1020]);
B("bay-number-plate-2", [210, 40, 160], [0, -460, 1020]);
B("bay-number-plate-3", [210, 40, 160], [500, -460, 1020]);
B("bay-number-plate-4", [210, 40, 160], [1000, -460, 1020]);
B("entry-side-rail", [75, 900, 750], [1250, 0, 375]);

return p.model();
