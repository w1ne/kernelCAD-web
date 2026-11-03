// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-facepiece-cleaning-sink",
  license: 'CC0-1.0',
  title: "Facepiece cleaning sink",
  description: "Dedicated facepiece basin with rinse spout, drying hooks and a clean-side shelf." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "facepiece", "cleaning", "sink"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7a8b85", { label: 'Asset color' });
const p = assembly("station-facepiece-cleaning-sink");

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

b("basin", [900, 600, 220], [0, 0, 880]);
b("backsplash", [900, 55, 520], [0, 270, 1110]);
b("leg-0", [65, 65, 770], [-350, -210, 385]);
b("leg-1", [65, 65, 770], [350, -210, 385]);
b("leg-2", [65, 65, 770], [-350, 210, 385]);
b("leg-3", [65, 65, 770], [350, 210, 385]);
b("clean-side-shelf", [440, 240, 45], [500, 100, 1010]);
c("rinse-spout", 230, 25, 8, [230, 125, 1040]);
c("dry-hook-0", 130, 18, 8, [-240, 220, 1230]);
c("dry-hook-1", 130, 18, 8, [-80, 220, 1230]);
c("dry-hook-2", 130, 18, 8, [80, 220, 1230]);
c("dry-hook-3", 130, 18, 8, [240, 220, 1230]);

return p.model();
