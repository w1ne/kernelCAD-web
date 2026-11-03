// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "gear-inspection-bench",
  license: 'CC0-1.0',
  title: "Gear inspection bench",
  description: "Durable inspection table with bright task-light mast, tool strip and shallow parts tray." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "gear", "inspection", "bench"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7e8981", { label: 'Asset color' });
const p = assembly("gear-inspection-bench");

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

b("top", [1500, 760, 65], [0, 0, 860]);
b("leg-0", [70, 70, 825], [-660, -300, 412.5]);
b("leg-1", [70, 70, 825], [660, -300, 412.5]);
b("leg-2", [70, 70, 825], [-660, 300, 412.5]);
b("leg-3", [70, 70, 825], [660, 300, 412.5]);
b("rear-tool-strip", [1380, 38, 110], [0, 340, 945]);
b("parts-tray", [500, 230, 70], [380, 130, 930]);
c("task-light-mast", 680, 22, 8, [-620, 235, 0]);
b("task-light-head", [230, 165, 55], [-620, 210, 700]);

return p.model();
