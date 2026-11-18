// Splash pad jet column: Low interactive water-play feature with a central jet post, four short spray arms, and a raised drain base.
meta({
  name: "splash-pad-jet-column",
  license: "CC0-1.0",
  title: "Splash pad jet column",
  description: "Low interactive water-play feature with a central jet post, four short spray arms, and a raised drain base. Controls: overall scale, stainlessSteel, rubber, enamel; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });
const enamel = param("enamel", "#cc684e", { label: "Baked enamel" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "rubber": "#3c4245",
    "enamel": "#edb34d"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "rubber": "#20262a",
    "enamel": "#385b81"
},
});
const originOffsetMm = -45;
const p = assembly("splash-pad-jet-column");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["drain-base", "spray-arm-0", "spray-arm-1", "spray-arm-2", "spray-arm-3"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["nozzle-3"].includes(name)) p.part(name, positioned.color(enamel));
  else if (["jet-column", "nozzle-0", "nozzle-1", "nozzle-2"].includes(name)) p.part(name, positioned.color(rubber));
  else p.part(name, positioned.color(stainlessSteel));
};
const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

C("drain-base", 90, 540, [0, 0, 45], [0, 0, 0], 14);
C("jet-column", 920, 70, [0, 0, 90]);
C("spray-arm-0", 420, 40, [180, 0, 420], [0, 0, 90], 8);
C("spray-arm-1", 420, 40, [-180, 0, 420], [0, 0, 90], 8);
C("spray-arm-2", 420, 40, [0, 180, 420], [0, 0, 0], 8);
C("spray-arm-3", 420, 40, [0, -180, 420], [0, 0, 0], 8);
S("nozzle-0", 56, [240, 0, 540]);
S("nozzle-1", 56, [-240, 0, 540]);
S("nozzle-2", 56, [0, 240, 540]);
S("nozzle-3", 56, [0, -240, 540]);

return p.model();
