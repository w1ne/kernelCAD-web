// Accessible ride transfer bench: Transfer area bench with clear side approach, back rail, and adjacent bag shelf.
meta({
  name: "accessible-ride-transfer-bench",
  license: "CC0-1.0",
  title: "Accessible ride transfer bench",
  description: "Transfer area bench with clear side approach, back rail, and adjacent bag shelf. Controls: overall scale, stainlessSteel, fiberglass, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "stainlessSteel": "#d1d1c6",
    "fiberglass": "#d7a83f",
    "rubber": "#3c4245"
},
  twilight: {
    "stainlessSteel": "#788b91",
    "fiberglass": "#96566d",
    "rubber": "#20262a"
},
});
const originOffsetMm = 0;
const p = assembly("accessible-ride-transfer-bench");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["back", "seat"].includes(name)) p.part(name, positioned.color(stainlessSteel));
  else if (["front-grab-rail"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["bag-shelf", "leg-0", "leg-1", "leg-2", "leg-3", "side-grab-rail"].includes(name)) p.part(name, positioned.color(fiberglass));
  else p.part(name, positioned.color(stainlessSteel));
};
const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};

B("seat", [1450, 520, 95], [0, 0, 610]);
B("back", [1450, 75, 740], [0, 220, 1000]);
B("leg-0", [95, 95, 570], [-600, -180, 285]);
B("leg-1", [95, 95, 570], [600, -180, 285]);
B("leg-2", [95, 95, 570], [-600, 180, 285]);
B("leg-3", [95, 95, 570], [600, 180, 285]);
B("bag-shelf", [1120, 440, 70], [0, 0, 140]);
B("side-grab-rail", [80, 75, 800], [760, 0, 800]);
B("front-grab-rail", [600, 75, 80], [550, -270, 680]);

return p.model();
