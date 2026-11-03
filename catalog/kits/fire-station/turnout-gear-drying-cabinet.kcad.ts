// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "turnout-gear-drying-cabinet",
  license: 'CC0-1.0',
  title: "Turnout gear drying cabinet",
  description: "Ventilated cabinet with hanging rails, perforated door and low drain tray." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "turnout", "gear", "drying", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6d8280", { label: 'Asset color' });
const p = assembly("turnout-gear-drying-cabinet");

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

b("base", [980, 700, 120], [0, 0, 60]);
b("cabinet", [900, 620, 1680], [0, 0, 960]);
b("left-door", [425, 32, 1570], [-215, -326, 960]);
b("right-door", [425, 32, 1570], [215, -326, 960]);
c("hanger-rail-0", 760, 18, 1670, [0, -140, 0], 8, 0);
c("hanger-rail-1", 760, 18, 1670, [0, 140, 0], 8, 0);
b("vent-grille", [620, 24, 115], [0, -330, 190]);

return p.model();
