// Original low-poly veterinary clinic scene asset. Millimetres, Z up, wall origin.
meta({
  name: "kennel-bowl-rail",
  license: 'CC0-1.0',
  title: "Kennel feeding bowl rail",
  description: "Wall-mounted feeding rail with three removable bowls and height-adjustable brackets." + ' Editable overall scale and asset color.',
  tags: ["veterinary", "animal clinic", "animal health", "kennel", "feeding", "bowl", "rail", "low poly", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "wall",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#70817e", { label: 'Asset color' });
const p = assembly("kennel-bowl-rail");

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

b("wall-rail", [1260, 65, 220], [0, 0, 380]);
b("upper-channel", [1260, 48, 48], [0, 0, 520]);
b("lower-channel", [1260, 48, 48], [0, 0, 260]);
c("bowl-1", 72, 105, 12, [-420, -100, 250]);
c("bowl-2", 72, 105, 12, [0, -100, 250]);
c("bowl-3", 72, 105, 12, [420, -100, 250]);
b("cup-bracket-1", [60, 180, 35], [-420, -25, 275]);
b("cup-bracket-2", [60, 180, 35], [0, -25, 275]);
b("cup-bracket-3", [60, 180, 35], [420, -25, 275]);
b("adjuster-left", [42, 42, 250], [-570, 0, 390]);
b("adjuster-right", [42, 42, 250], [570, 0, 390]);

return p.model();
