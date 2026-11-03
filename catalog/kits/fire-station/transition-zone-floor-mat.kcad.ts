// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "transition-zone-floor-mat",
  license: 'CC0-1.0',
  title: "Transition zone floor mat",
  description: "Low slip-resistant walk-off mat with a raised tread pattern and beveled rim." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "transition", "zone", "floor", "mat"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#706e5d", { label: 'Asset color' });
const p = assembly("transition-zone-floor-mat");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("mat", [1600, 920, 22], [0, 0, 11]);
b("tread-0", [28, 840, 6], [-730, 0, 25]);
b("tread-1", [28, 840, 6], [-625, 0, 25]);
b("tread-2", [28, 840, 6], [-520, 0, 25]);
b("tread-3", [28, 840, 6], [-415, 0, 25]);
b("tread-4", [28, 840, 6], [-310, 0, 25]);
b("tread-5", [28, 840, 6], [-205, 0, 25]);
b("tread-6", [28, 840, 6], [-100, 0, 25]);
b("tread-7", [28, 840, 6], [5, 0, 25]);
b("tread-8", [28, 840, 6], [110, 0, 25]);
b("tread-9", [28, 840, 6], [215, 0, 25]);
b("tread-10", [28, 840, 6], [320, 0, 25]);
b("tread-11", [28, 840, 6], [425, 0, 25]);
b("tread-12", [28, 840, 6], [530, 0, 25]);
b("tread-13", [28, 840, 6], [635, 0, 25]);
b("front-rim", [1600, 28, 28], [0, -460, 14]);
b("back-rim", [1600, 28, 28], [0, 460, 14]);

return p.model();
