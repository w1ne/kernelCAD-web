// Ride maintenance tool cart: Workshop cart with locking drawers, a parts tray, side handle, and four casters for attraction back-of-house scenes.
meta({
  name: "ride-maintenance-tool-cart",
  license: "CC0-1.0",
  title: "Ride maintenance tool cart",
  description: "Workshop cart with locking drawers, a parts tray, side handle, and four casters for attraction back-of-house scenes. Controls: overall scale, powderCoat, steel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const steel = param("steel", "#738087", { label: "Painted steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "steel": "#9da3a0",
    "rubber": "#3c4245"
},
  twilight: {
    "powderCoat": "#35576f",
    "steel": "#4f626c",
    "rubber": "#20262a"
},
});
const originOffsetMm = -80;
const p = assembly("ride-maintenance-tool-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["parts-bin"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["caster-0", "caster-1", "caster-2", "caster-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["cabinet", "drawer-0", "drawer-1", "drawer-2", "drawer-3", "side-handle", "top-tray"].includes(name)) p.part(name, positioned.color(steel));
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

B("cabinet", [1150, 720, 960], [0, 0, 560]);
B("top-tray", [1280, 850, 140], [0, 0, 1110]);
B("drawer-0", [1040, 45, 145], [0, -370, 300]);
B("drawer-1", [1040, 45, 145], [0, -370, 505]);
B("drawer-2", [1040, 45, 145], [0, -370, 710]);
B("drawer-3", [1040, 45, 145], [0, -370, 915]);
B("side-handle", [80, 600, 80], [615, 0, 1030]);
B("parts-bin", [550, 470, 200], [-250, 80, 1270]);
C("caster-0", 55, 82, [-410, -270, 80], [0, 0, 0], 8);
C("caster-1", 55, 82, [410, -270, 80], [0, 0, 0], 8);
C("caster-2", 55, 82, [-410, 270, 80], [0, 0, 0], 8);
C("caster-3", 55, 82, [410, 270, 80], [0, 0, 0], 8);

return p.model();
