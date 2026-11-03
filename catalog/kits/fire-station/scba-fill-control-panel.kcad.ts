// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "scba-fill-control-panel",
  license: 'CC0-1.0',
  title: "SCBA fill control panel",
  description: "Wall panel with pressure gauges, fill-valve controls and guarded hose sockets." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "scba", "fill", "control", "panel"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#667d7b", { label: 'Asset color' });
const p = assembly("scba-fill-control-panel");

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

b("backplate", [680, 70, 900], [0, 0, 1600]);
b("control-face", [610, 26, 780], [0, -48, 1600]);
c("gauge-0", 28, 75, 10, [-190, -80, 1900], [1, 0, 0], 90);
c("gauge-1", 28, 75, 10, [0, -80, 1900], [1, 0, 0], 90);
c("gauge-2", 28, 75, 10, [190, -80, 1900], [1, 0, 0], 90);
c("fill-socket-0", 90, 30, 8, [-200, -87, 1320], [1, 0, 0], 90);
c("fill-socket-1", 90, 30, 8, [0, -87, 1320], [1, 0, 0], 90);
c("fill-socket-2", 90, 30, 8, [200, -87, 1320], [1, 0, 0], 90);
b("instruction-card", [360, 18, 185], [0, -68, 1050]);

return p.model();
