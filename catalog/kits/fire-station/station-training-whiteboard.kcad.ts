// Original fire-station scene asset. Millimetres, Z up, wall origin.
meta({
  name: "station-training-whiteboard",
  license: 'CC0-1.0',
  title: "Station training whiteboard",
  description: "Wall training board with marker ledge, grid lines and three magnetic panels." + ' Editable overall scale and asset color.',
  tags: ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0", "training", "whiteboard"],
  kit: 'fire-station',
  category: 'prop',
  origin: "wall",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', "#7e8982", { label: 'Asset color' });
const p = assembly("station-training-whiteboard");

const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};

b("board", [1800, 55, 1100], [0, 0, 1600]);
b("left-panel", [560, 18, 980], [-610, -42, 1600]);
b("center-panel", [560, 18, 980], [0, -42, 1600]);
b("right-panel", [560, 18, 980], [610, -42, 1600]);
b("marker-tray", [1720, 135, 50], [0, -92, 1035]);
b("grid-v-0", [12, 15, 940], [-800, -56, 1600]);
b("grid-v-1", [12, 15, 940], [-600, -56, 1600]);
b("grid-v-2", [12, 15, 940], [-400, -56, 1600]);
b("grid-v-3", [12, 15, 940], [-200, -56, 1600]);
b("grid-v-4", [12, 15, 940], [0, -56, 1600]);
b("grid-v-5", [12, 15, 940], [200, -56, 1600]);
b("grid-v-6", [12, 15, 940], [400, -56, 1600]);
b("grid-v-7", [12, 15, 940], [600, -56, 1600]);
b("grid-v-8", [12, 15, 940], [800, -56, 1600]);

return p.model();
