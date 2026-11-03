// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "apparatus-bay-sectional-door",
  license: 'CC0-1.0',
  title: "Apparatus bay sectional door",
  description: "Full-height sectional door assembly with side guides, horizontal panels and upper vision lites." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "apparatus", "bay", "sectional", "door"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#778786", { label: 'Asset color' });
const p = assembly("apparatus-bay-sectional-door");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("left-guide", [100, 100, 3300], [-1650, 0, 1650]);
b("right-guide", [100, 100, 3300], [1650, 0, 1650]);
b("door-leaf", [3100, 75, 2800], [0, 0, 1450]);
b("door-seam-1", [3100, 18, 18], [0, -48, 610]);
b("door-seam-2", [3100, 18, 18], [0, -48, 940]);
b("door-seam-3", [3100, 18, 18], [0, -48, 1270]);
b("door-seam-4", [3100, 18, 18], [0, -48, 1600]);
b("door-seam-5", [3100, 18, 18], [0, -48, 1930]);
b("door-seam-6", [3100, 18, 18], [0, -48, 2260]);
b("door-seam-7", [3100, 18, 18], [0, -48, 2590]);
b("vision-lite-1", [430, 18, 220], [-360, -50, 2470]);
b("vision-lite-2", [430, 18, 220], [360, -50, 2470]);
b("vision-lite-3", [430, 18, 220], [1080, -50, 2470]);
b("header", [3400, 140, 180], [0, 0, 3210]);

return p.model();
