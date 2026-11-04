// Drop tower seat ring: Static circular ride-seat assembly with padded-looking backs, a central hub, and lower foot bars.
meta({
  name: "drop-tower-seat-ring",
  license: "CC0-1.0",
  title: "Drop tower seat ring",
  description: "Static circular ride-seat assembly with padded-looking backs, a central hub, and lower foot bars. Controls: overall scale, fiberglass, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "fiberglass": "#d7a83f",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "fiberglass": "#96566d",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = -250;
const p = assembly("drop-tower-seat-ring");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["seat-back-0", "seat-back-1", "seat-back-2", "seat-back-3", "seat-back-4", "seat-back-5", "seat-back-6", "seat-back-7", "seat-base-0", "seat-base-1", "seat-base-2", "seat-base-3", "seat-base-4", "seat-base-5", "seat-base-6", "seat-ring"].includes(name)) p.part(name, positioned.color(fiberglass));
  else if (["seat-base-7"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["center-hub", "foot-bar-0", "foot-bar-1", "foot-bar-2", "foot-bar-3", "foot-bar-4", "foot-bar-5", "foot-bar-6", "foot-bar-7"].includes(name)) p.part(name, positioned.color(steel));
  else p.part(name, positioned.color(fiberglass));
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

C("center-hub", 300, 370, [0, 0, 370], [0, 0, 0], 14);
C("seat-ring", 130, 940, [0, 0, 250], [0, 0, 0], 16);
B("seat-back-0", [330, 160, 620], [820.0, 0.0, 900], [0, 0, 0]);
B("seat-back-1", [330, 160, 620], [579.827560572969, 579.8275605729689, 900], [0, 0, 45]);
B("seat-back-2", [330, 160, 620], [5.021051876504148e-14, 820.0, 900], [0, 0, 90]);
B("seat-back-3", [330, 160, 620], [-579.8275605729689, 579.827560572969, 900], [0, 0, 135]);
B("seat-back-4", [330, 160, 620], [-820.0, 1.0042103753008296e-13, 900], [0, 0, 180]);
B("seat-back-5", [330, 160, 620], [-579.8275605729691, -579.8275605729689, 900], [0, 0, 225]);
B("seat-back-6", [330, 160, 620], [-1.5063155629512443e-13, -820.0, 900], [0, 0, 270]);
B("seat-back-7", [330, 160, 620], [579.8275605729689, -579.8275605729691, 900], [0, 0, 315]);
B("foot-bar-0", [330, 90, 90], [820.0, 0.0, 390], [0, 0, 0]);
B("foot-bar-1", [330, 90, 90], [579.827560572969, 579.8275605729689, 390], [0, 0, 45]);
B("foot-bar-2", [330, 90, 90], [5.021051876504148e-14, 820.0, 390], [0, 0, 90]);
B("foot-bar-3", [330, 90, 90], [-579.8275605729689, 579.827560572969, 390], [0, 0, 135]);
B("foot-bar-4", [330, 90, 90], [-820.0, 1.0042103753008296e-13, 390], [0, 0, 180]);
B("foot-bar-5", [330, 90, 90], [-579.8275605729691, -579.8275605729689, 390], [0, 0, 225]);
B("foot-bar-6", [330, 90, 90], [-1.5063155629512443e-13, -820.0, 390], [0, 0, 270]);
B("foot-bar-7", [330, 90, 90], [579.8275605729689, -579.8275605729691, 390], [0, 0, 315]);
B("seat-base-0", [350, 360, 180], [820.0, 0.0, 470], [0, 0, 0]);
B("seat-base-1", [350, 360, 180], [579.827560572969, 579.8275605729689, 470], [0, 0, 45]);
B("seat-base-2", [350, 360, 180], [5.021051876504148e-14, 820.0, 470], [0, 0, 90]);
B("seat-base-3", [350, 360, 180], [-579.8275605729689, 579.827560572969, 470], [0, 0, 135]);
B("seat-base-4", [350, 360, 180], [-820.0, 1.0042103753008296e-13, 470], [0, 0, 180]);
B("seat-base-5", [350, 360, 180], [-579.8275605729691, -579.8275605729689, 470], [0, 0, 225]);
B("seat-base-6", [350, 360, 180], [-1.5063155629512443e-13, -820.0, 470], [0, 0, 270]);
B("seat-base-7", [350, 360, 180], [579.8275605729689, -579.8275605729691, 470], [0, 0, 315]);

return p.model();
