// Original low-poly veterinary clinic scene asset. Millimetres, Z up, base origin.
meta({
  name: "surgical-scrub-sink",
  license: 'CC0-1.0',
  title: "Surgical scrub sink",
  description: "Deep wash basin with backsplash, twin taps, four legs and a lower foot control." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "surgical", "scrub", "sink", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#82908d", { label: 'Asset color' });
const p = assembly("surgical-scrub-sink");

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

b("basin-shell", [900, 520, 200], [0, 0, 800]);
b("basin-rim", [980, 580, 50], [0, 0, 920]);
b("backsplash", [980, 60, 380], [0, 250, 1120]);
b("leg-left-front", [62, 62, 790], [-370, -190, 395]);
b("leg-right-front", [62, 62, 790], [370, -190, 395]);
b("leg-left-back", [62, 62, 790], [-370, 190, 395]);
b("leg-right-back", [62, 62, 790], [370, 190, 395]);
c("tap-left", 180, 24, 10, [-180, 205, 960]);
c("tap-right", 180, 24, 10, [180, 205, 960]);
c("drain", 20, 45, 12, [0, 0, 780]);
b("foot-control", [250, 130, 34], [0, -235, 48]);

return p.model();
