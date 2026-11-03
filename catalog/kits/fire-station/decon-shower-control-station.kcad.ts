// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "decon-shower-control-station",
  license: 'CC0-1.0',
  title: "Decontamination shower controls",
  description: "Wall control panel with separate rinse and soap valves and a temperature dial." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "shower", "controls"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#71817d", { label: 'Asset color' });
const p = assembly("decon-shower-control-station");

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

b("mount-plate", [350, 56, 520], [0, 0, 1450]);
b("face", [285, 24, 430], [0, -40, 1450]);
c("valve-0", 38, 52, 8, [-75, -66, 1510], [1, 0, 0], 90);
c("valve-1", 38, 52, 8, [75, -66, 1510], [1, 0, 0], 90);
c("temperature-dial", 28, 72, 10, [0, -67, 1300], [1, 0, 0], 90);
b("label", [235, 18, 58], [0, -60, 1655]);

return p.model();
