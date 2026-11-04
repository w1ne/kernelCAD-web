// Ride photo camera: Elevated attraction camera on a three-leg stand with a sun hood and a large front lens barrel.
meta({
  name: "ride-photo-camera",
  license: "CC0-1.0",
  title: "Ride photo camera",
  description: "Elevated attraction camera on a three-leg stand with a sun hood and a large front lens barrel. Controls: overall scale, powderCoat, stainlessSteel, glass; festival and twilight material presets.",
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
const originOffsetMm = 14.219;
const p = assembly("ride-photo-camera");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["camera-body", "sun-hood"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["lens", "lens-barrel"].includes(name)) p.part(name, positioned.color(glass));
  else if (["mast", "tripod-foot-0", "tripod-foot-1", "tripod-foot-2", "tripod-leg-0", "tripod-leg-1", "tripod-leg-2"].includes(name)) p.part(name, positioned.color(stainlessSteel));
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

B("camera-body", [650, 470, 440], [0, 0, 1960]);
B("lens-barrel", [180, 260, 180], [0, -355, 1950], [90, 0, 0]);
B("sun-hood", [430, 470, 80], [0, -40, 2210]);
C("lens", 65, 135, [0, -500, 1950], [90, 0, 0], 10);
C("mast", 1140, 58, [0, 0, 1090], [0, 0, 0], 8);
B("tripod-leg-0", [55, 60, 1100], [-420, 0, 530], [20, 0, 0]);
B("tripod-leg-1", [55, 60, 1100], [210, -365, 530], [-12, 0, 0]);
B("tripod-leg-2", [55, 60, 1100], [210, 365, 530], [-12, 0, 0]);
B("tripod-foot-0", [420, 160, 55], [-420, 0, 30]);
B("tripod-foot-1", [420, 160, 55], [210, -365, 30]);
B("tripod-foot-2", [420, 160, 55], [210, 365, 30]);

return p.model();
