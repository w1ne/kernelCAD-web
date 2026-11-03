// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "contaminated-gear-rinse-sink",
  license: 'CC0-1.0',
  title: "Contaminated gear rinse sink",
  description: "Deep stainless rinse basin with backsplash, hose spray and lower storage shelf." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "contaminated", "gear", "rinse", "sink"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#788c86", { label: 'Asset color' });
const p = assembly("contaminated-gear-rinse-sink");

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

b("basin", [1050, 620, 300], [0, 0, 900]);
b("front-apron", [1050, 60, 330], [0, -295, 615]);
b("backsplash", [1050, 60, 380], [0, 280, 1120]);
b("leg-0", [65, 65, 840], [-440, -235, 420]);
b("leg-1", [65, 65, 840], [440, -235, 420]);
b("leg-2", [65, 65, 840], [-440, 235, 420]);
b("leg-3", [65, 65, 840], [440, 235, 420]);
b("lower-shelf", [910, 480, 45], [0, 0, 100]);
c("sprayer-neck", 360, 22, 8, [180, 0, 1040], [1, 0, 0], 90);
c("spray-head", 120, 34, 8, [180, -20, 940], [1, 0, 0], 90);

return p.model();
