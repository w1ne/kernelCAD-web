// Original fire-station scene asset. Millimetres, Z up, base origin.
meta({
  name: "station-alerting-control-console",
  license: 'CC0-1.0',
  title: "Station alerting control console",
  description: "Duty desk panel with incident display, station status buttons and speaker grille." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "alerting", "control", "console"],
  kit: 'fire-station',
  category: 'prop',
  origin: "base",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#687e7f", { label: 'Asset color' });
const p = assembly("station-alerting-control-console");

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

b("desk-base", [1100, 720, 760], [0, 0, 380]);
b("worktop", [1400, 840, 80], [0, 0, 800]);
b("raised-console", [990, 230, 300], [0, 250, 970]);
b("display", [520, 50, 330], [-260, 125, 1110]);
c("status-button-0", 28, 36, 8, [180, -48, 1000]);
c("status-button-1", 28, 36, 8, [300, -48, 1000]);
c("status-button-2", 28, 36, 8, [420, -48, 1000]);
b("speaker-grille", [245, 24, 105], [0, 118, 965]);

return p.model();
