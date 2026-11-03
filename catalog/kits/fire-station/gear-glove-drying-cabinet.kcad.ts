// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "gear-glove-drying-cabinet",
  license: 'CC0-1.0',
  title: "Gear glove drying cabinet",
  description: "Compact forced-air cabinet with four removable glove drying fingers." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "gear", "glove", "drying", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6e827d", { label: 'Asset color' });
const p = assembly("gear-glove-drying-cabinet");

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

b("base", [700, 540, 110], [0, 0, 55]);
b("body", [640, 480, 980], [0, 0, 600]);
b("door", [580, 28, 850], [0, -256, 600]);
c("drying-finger-0", 220, 27, 8, [-180, -285, 400], [1, 0, 0], 90);
c("drying-finger-1", 220, 27, 8, [-60, -285, 400], [1, 0, 0], 90);
c("drying-finger-2", 220, 27, 8, [60, -285, 680], [1, 0, 0], 90);
c("drying-finger-3", 220, 27, 8, [180, -285, 680], [1, 0, 0], 90);
b("air-grille", [500, 20, 95], [0, -257, 160]);

return p.model();
