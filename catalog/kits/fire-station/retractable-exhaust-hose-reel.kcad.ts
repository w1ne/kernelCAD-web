// Original fire-station scene asset. Millimetres, Z up, ceiling origin.
meta({
  name: "retractable-exhaust-hose-reel",
  license: 'CC0-1.0',
  title: "Retractable exhaust hose reel",
  description: "Ceiling hose reel with a compact motor housing, hose loop and tailpipe connector." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "retractable", "exhaust", "hose", "reel"],
  kit: 'fire-station',
  category: 'prop',
  origin: "ceiling",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#697d7d", { label: 'Asset color' });
const p = assembly("retractable-exhaust-hose-reel");

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

b("motor-box", [420, 310, 260], [0, 0, 0]);
c("reel-drum", 240, 180, 12, [0, 0, -210], [1, 0, 0], 90);
c("hose", 920, 28, 10, [0, -95, -1280]);
b("tailpipe-coupler", [145, 145, 185], [0, -105, -1370]);
b("mount-plate", [520, 420, 45], [0, 0, 140]);

return p.model();
