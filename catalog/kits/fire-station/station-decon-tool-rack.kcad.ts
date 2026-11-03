// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-decon-tool-rack",
  license: 'CC0-1.0',
  title: "Decontamination tool rack",
  description: "Wall rack with removable brush slots and a drip channel for cleaning tools." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "decontamination", "tool", "rack"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#78857d", { label: 'Asset color' });
const p = assembly("station-decon-tool-rack");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("backplate", [1200, 54, 1000], [0, 0, 1350]);
b("drip-channel", [1260, 180, 48], [0, -70, 840]);
b("tool-loop-0", [90, 46, 90], [-450, -60, 1100]);
b("tool-loop-1", [90, 46, 90], [-150, -60, 1100]);
b("tool-loop-2", [90, 46, 90], [150, -60, 1100]);
b("tool-loop-3", [90, 46, 90], [450, -60, 1100]);
b("handle-clip-0", [52, 30, 270], [-450, -80, 1500]);
b("handle-clip-1", [52, 30, 270], [-150, -80, 1500]);
b("handle-clip-2", [52, 30, 270], [150, -80, 1500]);
b("handle-clip-3", [52, 30, 270], [450, -80, 1500]);
b("label-strip", [1050, 20, 88], [0, -38, 1900]);

return p.model();
