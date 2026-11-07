// SPDX-License-Identifier: CC0-1.0
// Four-wheel roll cage with raised side grid, loading deck, swing door and pull handle

meta({
  name: "roll-cage-trolley",
  license: 'CC0-1.0',
  title: "Roll cage trolley",
  description: "Four-wheel roll cage with raised side grid, loading deck, swing door and pull handle. Knobs: overall scale and galvanized steel, rubber, polypropylene color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#7d898c', { label: 'Galvanized steel color' });
const rubber = param('rubber', '#292d30', { label: 'Rubber color' });
const polypropylene = param('polypropylene', '#d7a33e', { label: 'Polypropylene color' });

presets({
  cleanStore: {
    galvanizedSteel: '#afbabb',
    rubber: '#40474b',
    polypropylene: '#d6e0d5',
  },
  nightRestock: {
    galvanizedSteel: '#566468',
    rubber: '#262b2e',
    polypropylene: '#45614e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);

const p = assembly("roll-cage-trolley");
p.part("base-deck", b(0, 0, 160, 900, 720, 140).color(galvanizedSteel));
p.part("post--420--330", b(-420, -330, 770, 35, 35, 1540).color(galvanizedSteel));
p.part("post--420-330", b(-420, 330, 770, 35, 35, 1540).color(galvanizedSteel));
p.part("post-420--330", b(420, -330, 770, 35, 35, 1540).color(galvanizedSteel));
p.part("post-420-330", b(420, 330, 770, 35, 35, 1540).color(galvanizedSteel));
p.part("crossbar-0", b(0, 330, 230, 820, 22, 22).color(galvanizedSteel));
p.part("crossbar-1", b(0, 330, 440, 820, 22, 22).color(galvanizedSteel));
p.part("crossbar-2", b(0, 330, 650, 820, 22, 22).color(galvanizedSteel));
p.part("crossbar-3", b(0, 330, 860, 820, 22, 22).color(galvanizedSteel));
p.part("crossbar-4", b(0, 330, 1070, 820, 22, 22).color(galvanizedSteel));
p.part("crossbar-5", b(0, 330, 1280, 820, 22, 22).color(galvanizedSteel));
p.part("door-bar", b(390, -330, 720, 22, 30, 1360).color(galvanizedSteel));
p.part("pull-handle", b(420, -330, 720, 28, 80, 170).color(polypropylene));
p.part("caster--370--390", cx(-370, -390, 54, 72, 54, 8).color(rubber));
p.part("caster--370-390", cx(-370, 390, 54, 72, 54, 8).color(rubber));
p.part("caster-370--390", cx(370, -390, 54, 72, 54, 8).color(rubber));
p.part("caster-370-390", cx(370, 390, 54, 72, 54, 8).color(rubber));
p.part("caster-mount--370--350", b(-370, -350, 138, 45, 90, 96).color(galvanizedSteel));
p.part("caster-mount--370-350", b(-370, 350, 138, 45, 90, 96).color(galvanizedSteel));
p.part("caster-mount-370--350", b(370, -350, 138, 45, 90, 96).color(galvanizedSteel));
p.part("caster-mount-370-350", b(370, 350, 138, 45, 90, 96).color(galvanizedSteel));

return p.model();
