// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "scba-washing-machine",
  license: 'CC0-1.0',
  title: "SCBA washing machine",
  description: "Dedicated breathing-apparatus washer with sealed chamber, latch and cycle controls." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "washing", "machine"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#738481", { label: 'Asset color' });
const p = assembly("scba-washing-machine");

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

b("base", [960, 850, 160], [0, 0, 80]);
b("cabinet", [900, 760, 1320], [0, 0, 820]);
b("door-frame", [700, 42, 960], [0, -405, 820]);
b("door-window", [510, 20, 690], [0, -435, 840]);
b("control-panel", [250, 34, 250], [300, -408, 1240]);
c("latch", 65, 22, 8, [0, -456, 820], [1, 0, 0], 90);

return p.model();
