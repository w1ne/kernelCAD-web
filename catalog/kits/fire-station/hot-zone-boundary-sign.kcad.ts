// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "hot-zone-boundary-sign",
  license: 'CC0-1.0',
  title: "Hot-zone boundary sign",
  description: "Wall sign marking the transition from apparatus contamination zone to clean spaces." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "hot-zone", "boundary", "sign"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#b07a57", { label: 'Asset color' });
const p = assembly("hot-zone-boundary-sign");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("sign-panel", [920, 48, 440], [0, 0, 1660]);
b("top-header", [920, 70, 100], [0, 0, 1930]);
b("left-mount", [60, 90, 120], [-380, 30, 1350]);
b("right-mount", [60, 90, 120], [380, 30, 1350]);
b("zone-bar-0", [180, 28, 38], [-280, -28, 1540]);
b("zone-bar-1", [180, 28, 38], [0, -28, 1540]);
b("zone-bar-2", [180, 28, 38], [280, -28, 1540]);

return p.model();
