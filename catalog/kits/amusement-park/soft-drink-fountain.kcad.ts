// Soft drink fountain: Self-service beverage dispenser with cup ledge, four nozzle stations, drip tray, and splashback.
meta({
  name: "soft-drink-fountain",
  license: "CC0-1.0",
  title: "Soft drink fountain",
  description: "Self-service beverage dispenser with cup ledge, four nozzle stations, drip tray, and splashback. Controls: overall scale, stainlessSteel, acrylic, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const acrylic = param("acrylic", "#63aab8", { label: "Tinted acrylic" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "acrylic": "#79c8d2",
    "rubber": "#3c4245"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "acrylic": "#41768b",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("soft-drink-fountain");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["cup-ledge", "splashback"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["nozzle-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["cabinet", "drip-tray", "nozzle-0", "nozzle-1", "nozzle-2", "nozzle-station-0", "nozzle-station-1", "nozzle-station-2", "nozzle-station-3"].includes(name)) p.part(name, positioned.color(acrylic));
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

B("cabinet", [1150, 680, 1160], [0, 0, 580]);
B("splashback", [1180, 100, 620], [0, 340, 1470]);
B("cup-ledge", [1340, 540, 110], [0, -80, 1190]);
B("drip-tray", [1320, 410, 65], [0, -80, 1020]);
B("nozzle-station-0", [230, 190, 370], [-390, -250, 1410]);
B("nozzle-station-1", [230, 190, 370], [-130, -250, 1410]);
B("nozzle-station-2", [230, 190, 370], [130, -250, 1410]);
B("nozzle-station-3", [230, 190, 370], [390, -250, 1410]);
C("nozzle-0", 105, 36, [-390, -350, 1190], [0, 0, 0], 8);
C("nozzle-1", 105, 36, [-130, -350, 1190], [0, 0, 0], 8);
C("nozzle-2", 105, 36, [130, -350, 1190], [0, 0, 0], 8);
C("nozzle-3", 105, 36, [390, -350, 1190], [0, 0, 0], 8);

return p.model();
