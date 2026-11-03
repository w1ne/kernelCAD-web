// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "radio-charging-rack",
  license: 'CC0-1.0',
  title: "Radio charging rack",
  description: "Wall rack with six handheld-radio charging bays and cable management." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "radio", "charging", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#657c7d", { label: 'Asset color' });
const p = assembly("radio-charging-rack");

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

b("backplate", [1100, 60, 750], [0, 0, 1500]);
b("upper-rail", [1160, 90, 70], [0, -20, 1880]);
b("charger-0", [130, 160, 310], [-440, -105, 1425]);
b("charger-1", [130, 160, 310], [-264, -105, 1425]);
b("charger-2", [130, 160, 310], [-88, -105, 1425]);
b("charger-3", [130, 160, 310], [88, -105, 1425]);
b("charger-4", [130, 160, 310], [264, -105, 1425]);
b("charger-5", [130, 160, 310], [440, -105, 1425]);
c("radio-antenna-0", 160, 10, 8, [-440, -145, 1610]);
c("radio-antenna-1", 160, 10, 8, [-264, -145, 1610]);
c("radio-antenna-2", 160, 10, 8, [-88, -145, 1610]);
c("radio-antenna-3", 160, 10, 8, [88, -145, 1610]);
c("radio-antenna-4", 160, 10, 8, [264, -145, 1610]);
c("radio-antenna-5", 160, 10, 8, [440, -145, 1610]);
b("cable-tray", [1080, 85, 60], [0, 0, 1065]);

return p.model();
