// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "apparatus-bay-bollard",
  license: 'CC0-1.0',
  title: "Apparatus bay bollard",
  description: "Heavy floor bollard with a broad anchor plate and high-visibility upper sleeve." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "apparatus", "bay", "bollard"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#d09b51", { label: 'Asset color' });
const p = assembly("apparatus-bay-bollard");

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

c("post", 900, 85, 12, [0, 0, 0]);
c("reflective-band", 110, 91, 12, [0, 0, 620]);
b("anchor-foot", [260, 260, 90], [0, 0, 45]);

return p.model();
