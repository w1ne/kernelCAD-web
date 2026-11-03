// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "bay-trench-drain",
  license: 'CC0-1.0',
  title: "Apparatus bay trench drain",
  description: "Long grated drain channel with end outlet and removable grate panels." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "apparatus", "bay", "trench", "drain"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#687978", { label: 'Asset color' });
const p = assembly("bay-trench-drain");

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

b("channel-body", [3600, 210, 150], [0, 0, 75]);
b("grate-panel-0", [440, 204, 24], [-1500, 0, 162]);
b("grate-panel-1", [440, 204, 24], [-1000, 0, 162]);
b("grate-panel-2", [440, 204, 24], [-500, 0, 162]);
b("grate-panel-3", [440, 204, 24], [0, 0, 162]);
b("grate-panel-4", [440, 204, 24], [500, 0, 162]);
b("grate-panel-5", [440, 204, 24], [1000, 0, 162]);
b("grate-panel-6", [440, 204, 24], [1500, 0, 162]);
b("grate-slot-0", [18, 185, 10], [-1650, 0, 180]);
b("grate-slot-1", [18, 185, 10], [-1555, 0, 180]);
b("grate-slot-2", [18, 185, 10], [-1460, 0, 180]);
b("grate-slot-3", [18, 185, 10], [-1365, 0, 180]);
b("grate-slot-4", [18, 185, 10], [-1270, 0, 180]);
b("grate-slot-5", [18, 185, 10], [-1175, 0, 180]);
b("grate-slot-6", [18, 185, 10], [-1080, 0, 180]);
b("grate-slot-7", [18, 185, 10], [-985, 0, 180]);
b("grate-slot-8", [18, 185, 10], [-890, 0, 180]);
b("grate-slot-9", [18, 185, 10], [-795, 0, 180]);
b("grate-slot-10", [18, 185, 10], [-700, 0, 180]);
b("grate-slot-11", [18, 185, 10], [-605, 0, 180]);
b("grate-slot-12", [18, 185, 10], [-510, 0, 180]);
b("grate-slot-13", [18, 185, 10], [-415, 0, 180]);
b("grate-slot-14", [18, 185, 10], [-320, 0, 180]);
b("grate-slot-15", [18, 185, 10], [-225, 0, 180]);
b("grate-slot-16", [18, 185, 10], [-130, 0, 180]);
b("grate-slot-17", [18, 185, 10], [-35, 0, 180]);
b("grate-slot-18", [18, 185, 10], [60, 0, 180]);
b("grate-slot-19", [18, 185, 10], [155, 0, 180]);
b("grate-slot-20", [18, 185, 10], [250, 0, 180]);
b("grate-slot-21", [18, 185, 10], [345, 0, 180]);
b("grate-slot-22", [18, 185, 10], [440, 0, 180]);
b("grate-slot-23", [18, 185, 10], [535, 0, 180]);
b("grate-slot-24", [18, 185, 10], [630, 0, 180]);
b("grate-slot-25", [18, 185, 10], [725, 0, 180]);
b("grate-slot-26", [18, 185, 10], [820, 0, 180]);
b("grate-slot-27", [18, 185, 10], [915, 0, 180]);
b("grate-slot-28", [18, 185, 10], [1010, 0, 180]);
b("grate-slot-29", [18, 185, 10], [1105, 0, 180]);
b("grate-slot-30", [18, 185, 10], [1200, 0, 180]);
b("grate-slot-31", [18, 185, 10], [1295, 0, 180]);
b("grate-slot-32", [18, 185, 10], [1390, 0, 180]);
b("grate-slot-33", [18, 185, 10], [1485, 0, 180]);
b("grate-slot-34", [18, 185, 10], [1580, 0, 180]);
c("outlet", 200, 58, 12, [0, 0, 0]);

return p.model();
