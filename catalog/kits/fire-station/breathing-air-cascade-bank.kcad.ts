// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "breathing-air-cascade-bank",
  license: 'CC0-1.0',
  title: "Breathing air cascade bank",
  description: "Three-cylinder high-pressure storage bank with shared header, gauges and protective frame." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "breathing", "air", "cascade", "bank"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#6f817e", { label: 'Asset color' });
const p = assembly("breathing-air-cascade-bank");

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

c("storage-cylinder-0", 1650, 155, 12, [-430, 0, 110]);
c("storage-cylinder-1", 1650, 155, 12, [0, 0, 110]);
c("storage-cylinder-2", 1650, 155, 12, [430, 0, 110]);
b("frame-upright-0", [60, 95, 1850], [-650, 160, 925]);
b("frame-upright-1", [60, 95, 1850], [-215, 160, 925]);
b("frame-upright-2", [60, 95, 1850], [215, 160, 925]);
b("frame-upright-3", [60, 95, 1850], [650, 160, 925]);
b("top-rail", [1360, 110, 70], [0, 160, 1840]);
b("header", [1270, 58, 58], [0, -60, 1570]);
c("gauge-0", 26, 58, 10, [-440, -105, 1690], [1, 0, 0], 90);
c("gauge-1", 26, 58, 10, [0, -105, 1690], [1, 0, 0], 90);
c("gauge-2", 26, 58, 10, [440, -105, 1690], [1, 0, 0], 90);

return p.model();
