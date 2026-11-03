// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "clean-gear-cabinet",
  license: 'CC0-1.0',
  title: "Clean gear cabinet",
  description: "Ventilated clean-storage cabinet with divided shelves and a sealed door." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "clean", "gear", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#71847f", { label: 'Asset color' });
const p = assembly("clean-gear-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("base", [980, 650, 100], [0, 0, 50]);
b("cabinet", [900, 580, 1800], [0, 0, 1000]);
b("door", [840, 30, 1690], [0, -305, 1000]);
b("shelf-0", [820, 520, 40], [0, 0, 320]);
b("shelf-1", [820, 520, 40], [0, 0, 710]);
b("shelf-2", [820, 520, 40], [0, 0, 1100]);
b("shelf-3", [820, 520, 40], [0, 0, 1490]);
b("vent-0", [640, 20, 22], [0, -326, 120]);
b("vent-1", [640, 20, 22], [0, -326, 175]);
b("vent-2", [640, 20, 22], [0, -326, 230]);
b("vent-3", [640, 20, 22], [0, -326, 285]);
b("vent-4", [640, 20, 22], [0, -326, 340]);

return p.model();
