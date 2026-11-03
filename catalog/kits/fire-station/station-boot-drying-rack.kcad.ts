// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-boot-drying-rack",
  license: 'CC0-1.0',
  title: "Station boot drying rack",
  description: "Wall rail with six inverted boot nozzles and a removable drip channel." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "boot", "drying", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#71817b", { label: 'Asset color' });
const p = assembly("station-boot-drying-rack");

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

b("mount-rail", [1600, 70, 180], [0, 0, 1350]);
b("drip-channel", [1600, 160, 80], [0, -80, 860]);
c("boot-nozzle-0", 450, 28, 8, [-600, -130, 1090]);
c("boot-nozzle-1", 450, 28, 8, [-360, -130, 1090]);
c("boot-nozzle-2", 450, 28, 8, [-120, -130, 1090]);
c("boot-nozzle-3", 450, 28, 8, [120, -130, 1090]);
c("boot-nozzle-4", 450, 28, 8, [360, -130, 1090]);
c("boot-nozzle-5", 450, 28, 8, [600, -130, 1090]);
b("mount-bracket-0", [65, 100, 340], [-700, 0, 1200]);
b("mount-bracket-1", [65, 100, 340], [700, 0, 1200]);

return p.model();
