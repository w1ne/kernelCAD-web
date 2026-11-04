// Park operations radio rack: Back-of-house charging stand with six radio cradles, overhead status strip, and cable-routing shelf.
meta({
  name: "park-operations-radio-rack",
  license: "CC0-1.0",
  title: "Park operations radio rack",
  description: "Back-of-house charging stand with six radio cradles, overhead status strip, and cable-routing shelf. Controls: overall scale, powderCoat, stainlessSteel, acrylic; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
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
const p = assembly("park-operations-radio-rack");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["backplate", "base", "status-strip"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["status-indicator-0", "status-indicator-1", "status-indicator-2", "status-indicator-3", "status-indicator-4", "status-indicator-5"].includes(name)) p.part(name, positioned.color(acrylic));
  else if (["cable-shelf", "charging-cradle-0", "charging-cradle-1", "charging-cradle-2", "charging-cradle-3", "charging-cradle-4", "charging-cradle-5"].includes(name)) p.part(name, positioned.color(stainlessSteel));
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

B("backplate", [1520, 130, 1800], [0, 350, 900]);
B("base", [1660, 660, 160], [0, 0, 80]);
B("charging-cradle-0", [180, 210, 460], [-600, 200, 630]);
B("charging-cradle-1", [180, 210, 460], [-360, 200, 630]);
B("charging-cradle-2", [180, 210, 460], [-120, 200, 630]);
B("charging-cradle-3", [180, 210, 460], [120, 200, 630]);
B("charging-cradle-4", [180, 210, 460], [360, 200, 630]);
B("charging-cradle-5", [180, 210, 460], [600, 200, 630]);
B("status-strip", [1450, 170, 180], [0, 200, 1500]);
B("cable-shelf", [1420, 500, 95], [0, 0, 260]);
C("status-indicator-0", 55, 42, [-570, 100, 1600], [0, 0, 0], 8);
C("status-indicator-1", 55, 42, [-342, 100, 1600], [0, 0, 0], 8);
C("status-indicator-2", 55, 42, [-114, 100, 1600], [0, 0, 0], 8);
C("status-indicator-3", 55, 42, [114, 100, 1600], [0, 0, 0], 8);
C("status-indicator-4", 55, 42, [342, 100, 1600], [0, 0, 0], 8);
C("status-indicator-5", 55, 42, [570, 100, 1600], [0, 0, 0], 8);

return p.model();
