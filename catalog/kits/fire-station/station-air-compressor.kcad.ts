// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-air-compressor",
  license: 'CC0-1.0',
  title: "Station breathing-air compressor",
  description: "Enclosed breathing-air compressor skid with vertical receiver and filter stack." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "breathing-air", "compressor"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#75857e", { label: 'Asset color' });
const p = assembly("station-air-compressor");

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

b("base", [1250, 850, 140], [0, 0, 70]);
b("compressor-housing", [800, 700, 720], [-150, 0, 500]);
c("receiver", 700, 210, 12, [440, 0, 0]);
b("filter-stack", [220, 220, 800], [500, 0, 540]);
c("filter-bowl-0", 180, 72, 10, [500, 0, 500]);
c("filter-bowl-1", 180, 72, 10, [500, 0, 710]);
c("filter-bowl-2", 180, 72, 10, [500, 0, 920]);
b("control-box", [300, 200, 250], [400, -410, 620]);

return p.model();
