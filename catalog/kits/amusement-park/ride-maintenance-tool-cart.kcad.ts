// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({
  name: "ride-maintenance-tool-cart",
  license: "CC0-1.0",
  title: "Ride maintenance tool cart",
  description: "Workshop cart with locking drawers, a parts tray, side handle, and four casters for attraction back-of-house scenes. Editable overall scale and asset color.",
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const color = param("color", "#78877f", { label: "Asset color" });
const originOffsetMm = -80;
const p = assembly("ride-maintenance-tool-cart");

const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
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
