// Ice cream cart: Mobile frozen-treat cart with insulated chest, hinged lid, flavor-board canopy, and four wheels.
meta({
  name: "ice-cream-cart",
  license: "CC0-1.0",
  title: "Ice cream cart",
  description: "Mobile frozen-treat cart with insulated chest, hinged lid, flavor-board canopy, and four wheels. Controls: overall scale, powderCoat, stainlessSteel, rubber; festival and twilight material presets.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
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
const originOffsetMm = 0;
const p = assembly("ice-cream-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  const positioned = shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);
  if (["awning", "cart-body", "hinged-lid", "insulated-chest", "menu-board"].includes(name)) p.part(name, positioned.color(powderCoat));
  else if (["wheel-0", "wheel-1", "wheel-2", "wheel-3"].includes(name)) p.part(name, positioned.color(rubber));
  else if (["handle"].includes(name)) p.part(name, positioned.color(stainlessSteel));
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

B("cart-body", [1300, 850, 680], [0, 0, 420]);
B("insulated-chest", [1160, 720, 420], [0, 0, 970]);
B("hinged-lid", [1240, 800, 95], [0, 0, 1230]);
B("handle", [860, 80, 75], [0, 500, 790]);
B("menu-board", [1100, 70, 520], [0, 240, 1620]);
B("awning", [1650, 900, 90], [0, 0, 1940]);
C("wheel-0", 85, 190, [-470, -430, 190], [90, 0, 0], 10);
C("wheel-1", 85, 190, [470, -430, 190], [90, 0, 0], 10);
C("wheel-2", 85, 190, [-470, 430, 190], [90, 0, 0], 10);
C("wheel-3", 85, 190, [470, 430, 190], [90, 0, 0], 10);

return p.model();
