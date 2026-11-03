// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-utility-sink",
  license: 'CC0-1.0',
  title: "Station utility sink",
  description: "Deep mop sink with tall backsplash, faucet and pail-clearance legs." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "utility", "sink"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#798b85", { label: 'Asset color' });
const p = assembly("station-utility-sink");

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

b("basin", [900, 620, 330], [0, 0, 850]);
b("backsplash", [900, 58, 650], [0, 280, 1170]);
b("leg-0", [65, 65, 680], [-360, -230, 340]);
b("leg-1", [65, 65, 680], [360, -230, 340]);
b("leg-2", [65, 65, 680], [-360, 230, 340]);
b("leg-3", [65, 65, 680], [360, 230, 340]);
b("lower-shelf", [760, 470, 42], [0, 0, 68]);
c("faucet", 240, 24, 8, [0, 150, 1050]);
b("spray-handle", [52, 48, 250], [260, 180, 920]);

return p.model();
