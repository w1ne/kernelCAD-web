// First aid response cart: Compact wheeled response cart with divided supply drawers, grab handles, and a raised cross panel.
meta({
  name: "first-aid-response-cart",
  license: "CC0-1.0",
  title: "First aid response cart",
  description: "Compact wheeled response cart with divided supply drawers, grab handles, and a raised cross panel. Controls: overall scale, powderCoat, stainlessSteel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#477985", { label: "Powder-coated steel" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless steel" });
const rubber = param("rubber", "#292f33", { label: "Rubber" });

presets({
  festival: {
    "powderCoat": "#d47452",
    "stainlessSteel": "#d1d1c6",
    "rubber": "#3c4245"
},
  twilight: {
    "powderCoat": "#35576f",
    "stainlessSteel": "#788b91",
    "rubber": "#20262a"
},
});
const originOffsetMm = -85;
const p = assembly("first-aid-response-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["cart-body"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["caster-0", "caster-1", "caster-2", "caster-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["cross-horizontal", "cross-vertical", "drawer-0", "drawer-1", "drawer-2", "push-bar", "top-tray"].includes(name)) p.part(name, positioned.color(stainlessSteel));
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

B("cart-body", [980, 620, 740], [0, 0, 480]);
B("top-tray", [1040, 690, 95], [0, 0, 900]);
B("drawer-0", [870, 45, 130], [0, -324, 330]);
B("drawer-1", [870, 45, 130], [0, -324, 520]);
B("drawer-2", [870, 45, 130], [0, -324, 710]);
B("cross-vertical", [120, 45, 380], [-330, -365, 1150]);
B("cross-horizontal", [350, 45, 120], [-330, -365, 1150]);
C("caster-0", 52, 85, [-360, -230, 85], [0, 0, 0], 8);
C("caster-1", 52, 85, [360, -230, 85], [0, 0, 0], 8);
C("caster-2", 52, 85, [-360, 230, 85], [0, 0, 0], 8);
C("caster-3", 52, 85, [360, 230, 85], [0, 0, 0], 8);
B("push-bar", [760, 75, 75], [0, 355, 970]);

return p.model();
