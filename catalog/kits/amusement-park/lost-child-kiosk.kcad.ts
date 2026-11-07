// Lost child reunification kiosk: Quiet guest-support station with a canopy, two-sided service counter, privacy screen, and waiting seat.
meta({
  name: "lost-child-kiosk",
  license: "CC0-1.0",
  title: "Lost child reunification kiosk",
  description: "Quiet guest-support station with a canopy, two-sided service counter, privacy screen, and waiting seat. Controls: overall scale, powderCoat, paintedTimber, fabric; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const paintedTimber = param("paintedTimber", "#92704e", { label: "Painted timber" });
const fabric = param("fabric", "#c77786", { label: "Upholstery fabric" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "paintedTimber": "#be8a4e",
    "fabric": "#e4b765"
},
  twilight: {
    "powderCoat": "#35576f",
    "paintedTimber": "#5e7181",
    "fabric": "#557b8a"
},
});
const originOffsetMm = 0;
const p = assembly("lost-child-kiosk");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["canopy", "privacy-screen", "service-counter", "side-panel-left", "side-panel-right"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["waiting-seat"].includes(name)) p.part(name, positioned.color(fabric));
  else if (["base"].includes(name)) p.part(name, positioned.color(paintedTimber));
  else p.part(name, positioned.color(powderCoat));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("base", [1500, 1100, 100], [0, 0, 50]);
B("service-counter", [1420, 420, 870], [0, -180, 485]);
B("privacy-screen", [1360, 65, 840], [0, 390, 920]);
B("canopy", [1780, 1260, 120], [0, 40, 1420]);
B("side-panel-left", [70, 740, 850], [-690, 220, 650]);
B("side-panel-right", [70, 740, 850], [690, 220, 650]);
B("waiting-seat", [650, 300, 90], [0, 700, 480]);

return p.model();
