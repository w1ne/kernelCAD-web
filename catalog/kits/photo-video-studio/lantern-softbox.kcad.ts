// Original kernelCAD low-poly lantern softbox with a circular diffuser, internal support ribs, pole adapter and compact stand.
// Millimetres, Z up, base on z = 0. Separate diffuser fabric, polymer, metal and rubber zones keep the object readable and editable.

meta({
  name: "lantern-softbox",
  license: 'CC0-1.0',
  title: "Lantern softbox",
  description: "Lantern softbox with a circular diffuser, internal support ribs, pole adapter and compact stand. Knobs: overall scale and diffuser fabric, polymer, metal and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["lantern softbox", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const diffusionFabric = param('diffusionFabric', '#fff7e8', { label: 'Diffuser fabric' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { diffusionFabric: '#fff7e8', polymer: '#343c43', metal: '#a9b5ba', rubber: '#1b2024' },
  fieldRental: { diffusionFabric: '#fff0c8', polymer: '#c75a2e', metal: '#657780', rubber: '#292b2d' },
});
const p = assembly("lantern-softbox");
p.part("diffuser", (sphere(210).scale([1, 1, 0.9]).translate(0, 0, 720)).translate(0, 0, 0).scale(scale).color(diffusionFabric));
p.part("top-cap", (cylinder(24, 62, 12).translate(0, 0, 906)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("bottom-cap", (cylinder(24, 62, 12).translate(0, 0, 534)).translate(0, 0, 0).scale(scale).color(polymer));
p.part("rib-left", (box(12, 12, 360, true).rotate([0, 1, 0], 35).translate(0, 0, 720)).translate(0, 0, 0).scale(scale).color(metal));
p.part("rib-right", (box(12, 12, 360, true).rotate([0, 1, 0], -35).translate(0, 0, 720)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-pole", (cylinder(500, 18, 8).translate(0, 0, 28)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-hub", (cylinder(42, 34, 10).translate(0, 0, 20)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-leg-one", (box(38, 38, 340, true).rotate([0, 1, 0], 28).translate(0, 0, 182)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-leg-two", (box(38, 38, 340, true).rotate([0, 1, 0], 28).rotate([0, 0, 1], 120).translate(0, 0, 182)).translate(0, 0, 0).scale(scale).color(metal));
p.part("stand-leg-three", (box(38, 38, 340, true).rotate([0, 1, 0], 28).rotate([0, 0, 1], 240).translate(0, 0, 182)).translate(0, 0, 0).scale(scale).color(metal));
p.part("foot-one", (box(54, 54, 24, true).translate(-160, 0, 12)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-two", (box(54, 54, 24, true).translate(80, -138, 12)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("foot-three", (box(54, 54, 24, true).translate(80, 138, 12)).translate(0, 0, 0).scale(scale).color(rubber));

return p.model();
