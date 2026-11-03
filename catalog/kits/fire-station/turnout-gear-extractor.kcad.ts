// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "turnout-gear-extractor",
  license: 'CC0-1.0',
  title: "Turnout gear extractor",
  description: "Dedicated garment extractor with drum door, control panel and vibration feet." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "turnout", "gear", "extractor"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#738584", { label: 'Asset color' });
const p = assembly("turnout-gear-extractor");

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

b("base", [940, 900, 170], [0, 0, 85]);
b("cabinet", [860, 820, 1120], [0, 0, 730]);
c("door-rim", 48, 315, 12, [0, -420, 790], [1, 0, 0], 90);
b("door-window", [26, 510, 510], [0, -435, 790]);
b("control-panel", [220, 35, 260], [260, -432, 1150]);
b("vibration-foot-0", [100, 100, 85], [-340, -330, 42.5]);
b("vibration-foot-1", [100, 100, 85], [340, -330, 42.5]);
b("vibration-foot-2", [100, 100, 85], [-340, 330, 42.5]);
b("vibration-foot-3", [100, 100, 85], [340, 330, 42.5]);

return p.model();
