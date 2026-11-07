// Ride operator console: Freestanding dispatch console with a slanted control face, stop button, status lamps, and weather hood.
meta({
  name: "ride-operator-console",
  license: "CC0-1.0",
  title: "Ride operator console",
  description: "Freestanding dispatch console with a slanted control face, stop button, status lamps, and weather hood. Controls: overall scale, powderCoat, stainlessSteel, acrylic; festival and twilight material presets.",
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
const p = assembly("ride-operator-console");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["hood", "side-grab-left", "side-grab-right"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["control-face", "status-lamp-0", "status-lamp-1", "status-lamp-2", "status-lamp-3", "stop-button-guard"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["pedestal"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(powderCoat));
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

B("pedestal", [520, 480, 840], [0, 0, 420]);
B("control-face", [830, 200, 500], [0, -90, 1030], [-12, 0, 0]);
B("hood", [980, 580, 100], [0, 0, 1390]);
C("status-lamp-0", 85, 62, [-260, -220, 1260], [0, 0, 0], 8);
C("status-lamp-1", 85, 62, [-90, -220, 1260], [0, 0, 0], 8);
C("status-lamp-2", 85, 62, [90, -220, 1260], [0, 0, 0], 8);
C("status-lamp-3", 85, 62, [260, -220, 1260], [0, 0, 0], 8);
B("stop-button-guard", [200, 170, 60], [0, -215, 1150]);
B("side-grab-left", [80, 520, 80], [-500, 0, 860]);
B("side-grab-right", [80, 520, 80], [500, 0, 860]);

return p.model();
