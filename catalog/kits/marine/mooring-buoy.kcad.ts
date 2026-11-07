// Mooring buoy: A buoyant float carries a lifting eye and a lower chain shackle. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "mooring-buoy",
  license: 'CC0-1.0',
  title: "Mooring buoy",
  description: "Mooring buoy: A buoyant float carries a lifting eye and a lower chain shackle. Low-poly visualization prop. Material controls: safety vinyl, galvanized steel, stainless steel.",
  tags: ["mooring buoy", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyVinyl = param('safetyVinyl', '#c7503d', { label: 'Safety vinyl' });
const galvanizedSteel = param('galvanizedSteel', '#929fa2', { label: 'Galvanized steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
presets({
  weathered: { safetyVinyl: '#b05845', galvanizedSteel: '#8a918e', stainlessSteel: '#a9b1af' },
  highVisibility: { safetyVinyl: '#f17935' },
});
const p = assembly("mooring-buoy");
p.part("float-body", (sphere(180).scale([1, 1, 0.82]).translate(0, 0, 230)).translate(0, 0, 0).scale(scale).color(safetyVinyl));
p.part("top-cap", (cylinder(44, 90, 12).translate(0, 0, 356)).translate(0, 0, 0).scale(scale).color(safetyVinyl));
p.part("lifting-eye", (cylinder(34, 50, 12).subtract(cylinder(36, 28, 12).translate(0, 0, -1)).translate(0, 0, 398)).translate(0, 0, 0).scale(scale).color(galvanizedSteel));
p.part("chain-shackle", (cylinder(54, 33, 10).translate(0, 0, 0)).translate(0, 0, 0).scale(scale).color(stainlessSteel));

return p.model();
