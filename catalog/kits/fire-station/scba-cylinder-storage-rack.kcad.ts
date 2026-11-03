// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "scba-cylinder-storage-rack",
  license: 'CC0-1.0',
  title: "SCBA cylinder storage rack",
  description: "Floor rack with four upright cylinder bays, lower heel stops and retaining bar." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "cylinder", "storage", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70827e", { label: 'Asset color' });
const p = assembly("scba-cylinder-storage-rack");

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

b("base", [1500, 430, 90], [0, 0, 45]);
b("back-rail", [1500, 70, 1120], [0, 185, 650]);
b("divider-0", [42, 380, 1040], [-540, 0, 570]);
b("divider-1", [42, 380, 1040], [-180, 0, 570]);
b("divider-2", [42, 380, 1040], [180, 0, 570]);
b("divider-3", [42, 380, 1040], [540, 0, 570]);
c("heel-stop-0", 190, 88, 12, [-540, -90, 90]);
c("heel-stop-1", 190, 88, 12, [-180, -90, 90]);
c("heel-stop-2", 190, 88, 12, [180, -90, 90]);
c("heel-stop-3", 190, 88, 12, [540, -90, 90]);
b("retaining-bar", [1450, 55, 60], [0, 100, 1130]);

return p.model();
