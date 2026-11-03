// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-response-map-cabinet",
  license: 'CC0-1.0',
  title: "Station response map cabinet",
  description: "Wall map cabinet with hinged cover, grid insert and route-card pockets." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "response", "map", "cabinet"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7c8983", { label: 'Asset color' });
const p = assembly("station-response-map-cabinet");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backboard", [1500, 70, 1100], [0, 0, 1650]);
b("map-panel", [1350, 30, 850], [0, -52, 1670]);
b("cover", [1420, 42, 940], [0, -88, 1670]);
b("route-pocket-0", [350, 36, 240], [-480, -115, 1210]);
b("route-pocket-1", [350, 36, 240], [0, -115, 1210]);
b("route-pocket-2", [350, 36, 240], [480, -115, 1210]);
b("hinge-top", [1320, 40, 50], [0, 18, 2130]);
b("hinge-bottom", [1320, 40, 50], [0, 18, 1190]);

return p.model();
