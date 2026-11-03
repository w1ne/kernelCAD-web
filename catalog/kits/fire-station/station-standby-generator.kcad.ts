// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-standby-generator",
  license: 'CC0-1.0',
  title: "Station standby generator",
  description: "Enclosed standby generator with cooling louvers, exhaust stack and service panel." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "standby", "generator"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#798880", { label: 'Asset color' });
const p = assembly("station-standby-generator");

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

b("skid", [1700, 760, 140], [0, 0, 70]);
b("enclosure", [1580, 680, 1080], [0, 0, 680]);
b("louver-0", [480, 26, 38], [-450, -350, 780]);
b("louver-1", [480, 26, 38], [-150, -350, 780]);
b("louver-2", [480, 26, 38], [150, -350, 780]);
b("louver-3", [480, 26, 38], [450, -350, 780]);
b("service-door", [430, 35, 730], [500, -350, 650]);
c("exhaust-stack", 650, 62, 10, [-560, 210, 1080]);
b("control-box", [250, 140, 250], [790, -120, 900]);

return p.model();
