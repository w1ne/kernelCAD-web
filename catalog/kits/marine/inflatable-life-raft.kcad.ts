// Inflatable life raft: An inflatable perimeter surrounds a raft floor beneath a raised canopy. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "inflatable-life-raft",
  license: 'CC0-1.0',
  title: "Inflatable life raft",
  description: "Inflatable life raft: An inflatable perimeter surrounds a raft floor beneath a raised canopy. Low-poly visualization prop. Material controls: safety vinyl, stainless steel, canvas.",
  tags: ["inflatable life raft", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const safetyVinyl = param('safetyVinyl', '#d4b24e', { label: 'Safety vinyl' });
const stainlessSteel = param('stainlessSteel', '#b5c0c1', { label: 'Stainless steel' });
const canvas = param('canvas', '#ddd0a6', { label: 'Canvas' });
presets({
  weathered: { safetyVinyl: '#b99f52', stainlessSteel: '#a9b1af', canvas: '#c0b491' },
  highVisibility: { safetyVinyl: '#f17935' },
});
const p = assembly("inflatable-life-raft");
p.part("floor", (box(620, 480, 45, true).translate(0, 0, 72)).translate(0, 0, -49.5).scale(scale).color(safetyVinyl));
p.part("rail-front", (cylinder(720, 82, 12).rotate([0, 1, 0], 90).translate(-360, -240, 145)).translate(0, 0, -49.5).scale(scale).color(safetyVinyl));
p.part("rail-back", (cylinder(720, 82, 12).rotate([0, 1, 0], 90).translate(-360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(safetyVinyl));
p.part("rail-left", (cylinder(480, 82, 12).rotate([1, 0, 0], 90).translate(-360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(safetyVinyl));
p.part("rail-right", (cylinder(480, 82, 12).rotate([1, 0, 0], 90).translate(360, 240, 145)).translate(0, 0, -49.5).scale(scale).color(safetyVinyl));
p.part("canopy-pole", (cylinder(420, 18, 8).translate(0, 0, 170)).translate(0, 0, -49.5).scale(scale).color(stainlessSteel));
p.part("canopy", (box(430, 20, 20, true).translate(0, 0, 570)).translate(0, 0, -49.5).scale(scale).color(canvas));

return p.model();
