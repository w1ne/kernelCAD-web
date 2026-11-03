// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "boot-wash-scrubber",
  license: 'CC0-1.0',
  title: "Boot wash scrubber",
  description: "Low boot-cleaning station with two tread brushes, splash guards and a drain pan." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "boot", "wash", "scrubber"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#72857e", { label: 'Asset color' });
const p = assembly("boot-wash-scrubber");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("pan", [760, 520, 90], [0, 0, 45]);
b("left-brush", [230, 400, 180], [-175, 0, 180]);
b("right-brush", [230, 400, 180], [175, 0, 180]);
b("rear-splash", [760, 48, 260], [0, 230, 220]);
b("brush-ridge-0", [28, 355, 16], [-245, 0, 278]);
b("brush-ridge-1", [28, 355, 16], [-175, 0, 278]);
b("brush-ridge-2", [28, 355, 16], [-105, 0, 278]);
b("brush-ridge-3", [28, 355, 16], [-35, 0, 278]);
b("brush-ridge-4", [28, 355, 16], [35, 0, 278]);
b("brush-ridge-5", [28, 355, 16], [105, 0, 278]);
b("brush-ridge-6", [28, 355, 16], [175, 0, 278]);
b("brush-ridge-7", [28, 355, 16], [245, 0, 278]);

return p.model();
