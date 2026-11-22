// Original kernelCAD low-poly hot-shoe flash unit with a tilting rectangular head, rear control panel and swivel foot.
// Millimetres, Z up, base on z = 0. Separate metal, polymer, diffuser polycarbonate and optical glass zones keep the object readable and editable.

meta({
  name: "speedlight-flash",
  license: 'CC0-1.0',
  title: "Speedlight flash",
  description: "Hot-shoe flash unit with a tilting rectangular head, rear control panel and swivel foot. Knobs: overall scale and metal, polymer, diffuser polycarbonate and optical glass color controls. Presets: studioBlack and fieldRental.",
  tags: ["speedlight flash", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const metal = param('metal', '#a9b5ba', { label: 'Metal' });
const polymer = param('polymer', '#343c43', { label: 'Polymer' });
const polycarbonate = param('polycarbonate', '#d7e4e3', { label: 'Diffuser polycarbonate' });
const glass = param('glass', '#45a6c0', { label: 'Optical glass' });

presets({
  studioBlack: { metal: '#a9b5ba', polymer: '#343c43', polycarbonate: '#d7e4e3', glass: '#45a6c0' },
  fieldRental: { metal: '#657780', polymer: '#c75a2e', polycarbonate: '#f0c75a', glass: '#79d4e3' },
});
const p = assembly("speedlight-flash");
p.part("base", (box(62, 68, 25, true).translate(0, 0, 14)).translate(0, 0, 9).scale(scale).color(metal));
p.part("foot", (box(42, 28, 18, true).translate(0, 0, 0)).translate(0, 0, 9).scale(scale).color(metal));
p.part("upright", (box(64, 42, 136, true).translate(0, 0, 94)).translate(0, 0, 9).scale(scale).color(polymer));
p.part("flash-head", (box(138, 63, 76, true).rotate([1, 0, 0], -12).translate(0, -16, 190)).translate(0, 0, 9).scale(scale).color(polymer));
p.part("diffuser", (box(106, 6, 48, true).translate(0, -51, 193)).translate(0, 0, 9).scale(scale).color(polycarbonate));
p.part("rear-screen", (box(30, 5, 40, true).translate(0, 23, 106)).translate(0, 0, 9).scale(scale).color(glass));
p.part("control-dial", (cylinder(10, 14, 8).translate(22, 18, 78)).translate(0, 0, 9).scale(scale).color(polymer));

return p.model();
