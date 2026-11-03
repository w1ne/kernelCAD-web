// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-key-control-cabinet",
  license: 'CC0-1.0',
  title: "Station key control cabinet",
  description: "Lockable key cabinet with numbered hooks, access keypad and issue-return slots." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "key", "control", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7b837a", { label: 'Asset color' });
const p = assembly("station-key-control-cabinet");

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

b("cabinet", [760, 300, 980], [0, 0, 490]);
b("door", [700, 28, 900], [0, -165, 490]);
c("key-hook-0", 55, 14, 8, [-260, -190, 600]);
c("key-hook-1", 55, 14, 8, [-130, -190, 600]);
c("key-hook-2", 55, 14, 8, [0, -190, 600]);
c("key-hook-3", 55, 14, 8, [130, -190, 600]);
c("key-hook-4", 55, 14, 8, [260, -190, 600]);
c("key-hook-5", 55, 14, 8, [-260, -190, 770]);
c("key-hook-6", 55, 14, 8, [-130, -190, 770]);
c("key-hook-7", 55, 14, 8, [0, -190, 770]);
c("key-hook-8", 55, 14, 8, [130, -190, 770]);
c("key-hook-9", 55, 14, 8, [260, -190, 770]);
b("keypad", [145, 25, 210], [460, -190, 640]);
b("return-slot", [250, 35, 65], [-50, -195, 185]);

return p.model();
