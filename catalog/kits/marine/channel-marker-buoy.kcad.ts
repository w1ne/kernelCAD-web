// Channel marker buoy: A weighted float supports a marker mast, daymark, and top ball. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "channel-marker-buoy",
  license: 'CC0-1.0',
  title: "Channel marker buoy",
  description: "Channel marker buoy: A weighted float supports a marker mast, daymark, and top ball. Low-poly visualization prop. Material controls: safety vinyl, safety amber lens, galvanized steel.",
  tags: ["channel marker buoy", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyVinyl = param('safetyVinyl', '#df4f39', { label: 'Safety vinyl' });
const safetyAmber = param('safetyAmber', '#f2b536', { label: 'Safety amber lens' });
const galvanizedSteel = param('galvanizedSteel', '#929fa2', { label: 'Galvanized steel' });
presets({
  weathered: { safetyVinyl: '#c15743', safetyAmber: '#cfa140', galvanizedSteel: '#8a918e' },
  highVisibility: { safetyVinyl: '#f17935' },
});
const p = assembly("channel-marker-buoy");
p.part("float", (cylinder(290, 145, 10).translate(0, 0, 90)).translate(0, 0, 0).scale(scale).color(safetyVinyl));
p.part("float-cap", (cylinder(40, 158, 10).translate(0, 0, 350)).translate(0, 0, 0).scale(scale).color(safetyAmber));
p.part("mast", (cylinder(670, 18, 8).translate(0, 0, 390)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("daymark", (box(190, 45, 150, true).translate(0, 0, 920)).translate(0, 0, 0).scale(scale).color(safetyAmber));
p.part("top-ball", (sphere(45).translate(0, 0, 1030)).translate(0, 0, 0).scale(scale).color(safetyVinyl));
p.part("keel-weight", (cylinder(100, 70, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));

return p.model();
