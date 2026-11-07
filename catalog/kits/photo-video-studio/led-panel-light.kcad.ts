// Original kernelCAD low-poly rectangular LED panel with a rear yoke, tilt knobs and compact floor stand.
// Millimetres, Z up, base on z = 0. Separate polymer, diffuser polycarbonate and metal zones keep the object readable and editable.

meta({
  name: "led-panel-light",
  license: 'CC0-1.0',
  title: "LED panel light",
  description: "Rectangular LED panel with a rear yoke, tilt knobs and compact floor stand. Knobs: overall scale and polymer, diffuser polycarbonate and metal color controls. Presets: studioBlack and fieldRental.",
  tags: ["led panel light", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const polycarbonate = param('polycarbonate', '#d7e4e3', { label: 'Diffuser polycarbonate' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });

presets({
  studioBlack: { polymer: '#343c43', polycarbonate: '#d7e4e3', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', polycarbonate: '#f0c75a', metal: '#657780' },
});
const p = assembly("led-panel-light");
p.part("panel", (box(350, 65, 270, true).translate(0, 0, 880)).translate(0, 0, -3.75).scale(scale).color(polymer));
p.part("diffuser-face", (box(314, 7, 234, true).translate(0, -36, 880)).translate(0, 0, -3.75).scale(scale).color(polycarbonate));
p.part("yoke-crossbar", (box(390, 26, 24, true).translate(0, 24, 748)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("yoke-left", (box(22, 26, 186, true).translate(-176, 24, 835)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("yoke-right", (box(22, 26, 186, true).translate(176, 24, 835)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("stand-pole", (cylinder(690, 19, 8).translate(0, 0, 92)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("stand-hub", (cylinder(45, 34, 10).translate(0, 0, 80)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("stand-leg-one", (box(36, 350, 24, true).rotate([0, 1, 0], 15).translate(0, 0, 20)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("stand-leg-two", (box(36, 350, 24, true).rotate([0, 1, 0], -15).rotate([0, 0, 1], 120).translate(0, 0, 20)).translate(0, 0, -3.75).scale(scale).color(metal));
p.part("stand-leg-three", (box(36, 350, 24, true).rotate([0, 1, 0], -15).rotate([0, 0, 1], 240).translate(0, 0, 20)).translate(0, 0, -3.75).scale(scale).color(metal));

return p.model();
