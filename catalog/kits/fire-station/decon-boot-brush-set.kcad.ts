// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "decon-boot-brush-set",
  license: 'CC0-1.0',
  title: "Decontamination boot brush set",
  description: "Pair of upright boot brushes fixed to a drainable floor plate." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "boot", "brush", "set"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#72857e", { label: 'Asset color' });
const p = assembly("decon-boot-brush-set");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("footplate", [580, 390, 62], [0, 0, 31]);
b("brush-0", [180, 75, 420], [-150, 0, 272]);
b("brush-1", [180, 75, 420], [150, 0, 272]);
b("bristle-0", [20, 54, 340], [-225, -10, 300]);
b("bristle-1", [20, 54, 340], [-195, -10, 300]);
b("bristle-2", [20, 54, 340], [-165, -10, 300]);
b("bristle-3", [20, 54, 340], [-135, -10, 300]);
b("bristle-4", [20, 54, 340], [-105, -10, 300]);
b("bristle-5", [20, 54, 340], [-75, -10, 300]);
b("bristle-6", [20, 54, 340], [-45, -10, 300]);
b("bristle-7", [20, 54, 340], [-15, -10, 300]);
b("bristle-8", [20, 54, 340], [15, -10, 300]);
b("bristle-9", [20, 54, 340], [45, -10, 300]);
b("bristle-10", [20, 54, 340], [75, -10, 300]);
b("bristle-11", [20, 54, 340], [105, -10, 300]);
b("bristle-12", [20, 54, 340], [135, -10, 300]);
b("bristle-13", [20, 54, 340], [165, -10, 300]);
b("bristle-14", [20, 54, 340], [195, -10, 300]);
b("bristle-15", [20, 54, 340], [225, -10, 300]);
b("grab-rail", [55, 45, 520], [0, 155, 325]);

return p.model();
