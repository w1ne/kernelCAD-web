// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-airlock-door-closer",
  license: 'CC0-1.0',
  title: "Station airlock door closer",
  description: "Door-top closer assembly with hydraulic body, swing arm and wall shoe." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "airlock", "door", "closer"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#777f79", { label: 'Asset color' });
const p = assembly("station-airlock-door-closer");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("door-leaf", [900, 72, 2200], [0, 0, 1100]);
b("closer-body", [380, 90, 74], [190, -78, 2145]);
b("arm", [490, 34, 34], [-10, -72, 2170], [0, 0, 15]);
b("shoe", [95, 55, 80], [-245, -55, 2150]);
b("threshold", [920, 120, 38], [0, 0, 19]);

return p.model();
