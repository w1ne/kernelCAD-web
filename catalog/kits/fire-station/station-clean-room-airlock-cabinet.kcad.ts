// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-clean-room-airlock-cabinet",
  license: 'CC0-1.0',
  title: "Clean-room airlock cabinet",
  description: "Pass-through cabinet with separate dirty-side and clean-side doors." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean-room", "airlock", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#718580", { label: 'Asset color' });
const p = assembly("station-clean-room-airlock-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("cabinet", [1080, 680, 1100], [0, 0, 550]);
b("dirty-door", [500, 28, 960], [-270, -355, 550]);
b("clean-door", [500, 28, 960], [270, 355, 550]);
b("shelf", [970, 480, 60], [0, 0, 550]);
b("door-handle-dirty", [32, 44, 250], [-80, -390, 550]);
b("door-handle-clean", [32, 44, 250], [460, 390, 550]);
b("status-strip", [900, 18, 90], [0, -360, 1070]);

return p.model();
