// Entrance planter: Long entry plaza planter with four low ornamental shrubs spaced along a raised rim.
meta({
  name: "entrance-planter",
  license: "CC0-1.0",
  title: "Entrance planter",
  description: "Long entry plaza planter with four low ornamental shrubs spaced along a raised rim. Controls: overall scale, concrete, powderCoat, leaves; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const concrete = param("concrete", "#92938b", { label: "Concrete" });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const leaves = param("leaves", "#6d8d47", { label: "Foliage" });

presets({
  festival: {
    "concrete": "#aaa99e",
    "powderCoat": "#d47452",
    "leaves": "#91a84e"
},
  twilight: {
    "concrete": "#6f7477",
    "powderCoat": "#35576f",
    "leaves": "#456f42"
},
});
const originOffsetMm = 0;
const p = assembly("entrance-planter");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["planter-box"].includes(name)) p.part(name, positioned.color(concrete));
  else if (["shrub-0", "shrub-1", "shrub-2", "shrub-3", "shrub-crown-0", "shrub-crown-1", "shrub-crown-2", "shrub-crown-3"].includes(name)) p.part(name, positioned.color(leaves));
  else if (["rim"].includes(name)) p.part(name, positioned.color(powderCoat));
  else p.part(name, positioned.color(concrete));
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
const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);

B("planter-box", [2100, 720, 420], [0, 0, 210]);
B("rim", [2220, 820, 75], [0, 0, 450]);
C("shrub-0", 560, 210, [-720, 0, 520], [0, 0, 0], 9);
C("shrub-1", 560, 210, [-240, 0, 520], [0, 0, 0], 9);
C("shrub-2", 560, 210, [240, 0, 520], [0, 0, 0], 9);
C("shrub-3", 560, 210, [720, 0, 520], [0, 0, 0], 9);
S("shrub-crown-0", 200, [-720, 0, 800]);
S("shrub-crown-1", 200, [-240, 0, 800]);
S("shrub-crown-2", 200, [240, 0, 800]);
S("shrub-crown-3", 200, [720, 0, 800]);

return p.model();
