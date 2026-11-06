// Original kernelCAD low-poly shoulder-mounted camera support with twin rods, rear shoulder pad, handgrips and front camera plate.
// Millimetres, Z up, base on z = 0. Separate metal, foam and rubber zones keep the object readable and editable.

meta({
  name: "shoulder-rig",
  license: 'CC0-1.0',
  title: "Shoulder camera rig",
  description: "Shoulder-mounted camera support with twin rods, rear shoulder pad, handgrips and front camera plate. Knobs: overall scale and metal, foam and rubber color controls. Presets: studioBlack and fieldRental.",
  tags: ["shoulder rig", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const foam = param('foam', '#514844', { label: 'Foam' });
const rubber = param('rubber', '#1b2024', { label: 'Rubber' });

presets({
  studioBlack: { metal: '#a9b5ba', foam: '#514844', rubber: '#1b2024' },
  fieldRental: { metal: '#657780', foam: '#596c53', rubber: '#292b2d' },
});
const p = assembly("shoulder-rig");
p.part("rail-left", (cylinder(520, 12, 8).rotate([0, 1, 0], 90).translate(0, -46, 130)).translate(0, 0, 0).scale(scale).color(metal));
p.part("rail-right", (cylinder(520, 12, 8).rotate([0, 1, 0], 90).translate(0, 46, 130)).translate(0, 0, 0).scale(scale).color(metal));
p.part("shoulder-pad", (box(230, 180, 74, true).translate(-275, 0, 110)).translate(0, 0, 0).scale(scale).color(foam));
p.part("camera-plate", (box(180, 150, 26, true).translate(235, 0, 160)).translate(0, 0, 0).scale(scale).color(metal));
p.part("left-handgrip", (cylinder(120, 30, 10).translate(120, -84, 0)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("right-handgrip", (cylinder(120, 30, 10).translate(120, 84, 0)).translate(0, 0, 0).scale(scale).color(rubber));
p.part("crossbar", (box(34, 190, 24, true).translate(-100, 0, 126)).translate(0, 0, 0).scale(scale).color(metal));
p.part("rear-counterweight", (box(120, 90, 100, true).translate(-395, 0, 170)).translate(0, 0, 0).scale(scale).color(metal));

return p.model();
