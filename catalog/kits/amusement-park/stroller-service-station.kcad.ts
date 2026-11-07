// Stroller service station: Guest support stand with parking rail, compact air pump, repair shelf, and a wheel service cradle.
meta({
  name: "stroller-service-station",
  license: "CC0-1.0",
  title: "Stroller service station",
  description: "Guest support stand with parking rail, compact air pump, repair shelf, and a wheel service cradle. Controls: overall scale, steel, stainlessSteel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const steel = param("steel", "#738087", { label: "Painted steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "steel": "#9da3a0",
    "stainlessSteel": "#d1d1c6",
    "rubber": "#3c4245"
},
  twilight: {
    "steel": "#4f626c",
    "stainlessSteel": "#788b91",
    "rubber": "#20262a"
},
});
const originOffsetMm = 30;
const p = assembly("stroller-service-station");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["backboard", "pump-cylinder"].includes(name)) p.part(name, positioned.color(steel));
  else if (["wheel-cradle-left", "wheel-cradle-right"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["parking-rail-0", "parking-rail-1", "parking-rail-2", "pump-handle", "repair-tray", "service-shelf"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else p.part(name, positioned.color(steel));
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

B("backboard", [1420, 100, 1760], [0, 420, 880]);
B("service-shelf", [1540, 680, 110], [0, 0, 510]);
C("pump-cylinder", 780, 105, [-470, 150, 620]);
C("pump-handle", 250, 32, [-470, 150, 1420], [90, 0, 0], 8);
B("wheel-cradle-left", [150, 700, 350], [320, -150, 250]);
B("wheel-cradle-right", [150, 700, 350], [700, -150, 250]);
C("parking-rail-0", 980, 30, [-800, 180, 0], [0, 90, 0], 8);
C("parking-rail-1", 980, 30, [0, 180, 0], [0, 90, 0], 8);
C("parking-rail-2", 980, 30, [800, 180, 0], [0, 90, 0], 8);
B("repair-tray", [680, 430, 80], [550, -90, 670]);

return p.model();
