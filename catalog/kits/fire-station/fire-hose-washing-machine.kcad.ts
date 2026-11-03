// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "fire-hose-washing-machine",
  license: 'CC0-1.0',
  title: "Fire hose washing machine",
  description: "Station hose washer with feed rollers, covered wash chamber and drain tray." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hose", "washing", "machine"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#69817f", { label: 'Asset color' });
const p = assembly("fire-hose-washing-machine");

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

b("base", [1000, 760, 180], [0, 0, 90]);
b("wash-cabinet", [840, 580, 650], [0, 0, 505]);
b("front-door", [650, 30, 420], [0, -306, 545]);
c("feed-roller-0", 48, 82, 10, [-370, -335, 298], [1, 0, 0], 90);
c("feed-roller-1", 48, 82, 10, [-140, -335, 298], [1, 0, 0], 90);
c("feed-roller-2", 48, 82, 10, [90, -335, 298], [1, 0, 0], 90);
c("feed-roller-3", 48, 82, 10, [320, -335, 298], [1, 0, 0], 90);
b("top-control", [330, 28, 140], [280, -303, 870]);
b("drip-tray", [980, 760, 32], [0, 0, 196]);

return p.model();
