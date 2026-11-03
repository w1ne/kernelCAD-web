// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "facepiece-drying-cabinet",
  license: 'CC0-1.0',
  title: "Facepiece drying cabinet",
  description: "Clean cabinet with individually spaced mask hooks and filtered-air vents." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "facepiece", "drying", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70847f", { label: 'Asset color' });
const p = assembly("facepiece-drying-cabinet");

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

b("base", [800, 530, 100], [0, 0, 50]);
b("body", [740, 470, 1350], [0, 0, 775]);
b("door", [690, 28, 1240], [0, -248, 780]);
c("mask-hook-0", 120, 18, 8, [-260, -270, 450]);
c("mask-hook-1", 120, 18, 8, [-130, -270, 900]);
c("mask-hook-2", 120, 18, 8, [0, -270, 450]);
c("mask-hook-3", 120, 18, 8, [130, -270, 900]);
c("mask-hook-4", 120, 18, 8, [260, -270, 450]);
b("vent-0", [620, 20, 28], [0, -270, 250]);
b("vent-1", [620, 20, 28], [0, -270, 355]);
b("vent-2", [620, 20, 28], [0, -270, 460]);
b("vent-3", [620, 20, 28], [0, -270, 565]);
b("vent-4", [620, 20, 28], [0, -270, 670]);

return p.model();
