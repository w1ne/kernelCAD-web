// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "contaminated-gear-bagging-cart",
  license: 'CC0-1.0',
  title: "Contaminated gear bagging cart",
  description: "Closed transport cart with segregated bag bins and a lid for recently used equipment." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "contaminated", "gear", "bagging", "cart"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#857c69", { label: 'Asset color' });
const p = assembly("contaminated-gear-bagging-cart");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};
const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {
  let shape = cylinder(h, r, segments);
  if (axis && degrees) shape = shape.rotate(axis, degrees);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("cart-body", [820, 620, 740], [0, 0, 420]);
b("lid", [860, 660, 70], [0, 0, 825]);
b("bin-front-0", [360, 35, 300], [-205, -332, 270]);
b("bin-front-1", [360, 35, 300], [205, -332, 270]);
c("caster-0", 42, 44, 8, [-310, -220, 0]);
c("caster-1", 42, 44, 8, [310, -220, 0]);
c("caster-2", 42, 44, 8, [-310, 220, 0]);
c("caster-3", 42, 44, 8, [310, 220, 0]);
b("push-handle", [720, 45, 42], [0, 325, 800]);

return p.model();
