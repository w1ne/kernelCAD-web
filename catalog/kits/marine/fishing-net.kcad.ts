// Fishing net: Crossed net strands hang from reinforced side ropes and top and bottom lines. Low-poly visualization geometry, millimetres, Z up.
// Material controls are assigned to the named physical components below.

meta({
  name: "fishing-net",
  license: 'CC0-1.0',
  title: "Fishing net",
  description: "Fishing net: Crossed net strands hang from reinforced side ropes and top and bottom lines. Low-poly visualization prop. Material controls: rope fiber, nylon netting.",
  tags: ["fishing net", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ropeFiber = param('ropeFiber', '#72654d', { label: 'Rope fiber' });
const nylonNetting = param('nylonNetting', '#73674f', { label: 'Nylon netting' });
presets({
  weathered: { ropeFiber: '#736751', nylonNetting: '#736952' },
  highVisibility: { ropeFiber: '#c19d53' },
});
const p = assembly("fishing-net");
p.part("top-rope", (cylinder(980, 18, 8).rotate([0, 1, 0], 90).translate(-490, 0, 620)).translate(0, 0, -21).scale(scale).color(ropeFiber));
p.part("bottom-rope", (cylinder(980, 24, 8).rotate([0, 1, 0], 90).translate(-490, 0, 45)).translate(0, 0, -21).scale(scale).color(ropeFiber));
p.part("side-left", (cylinder(580, 16, 8).translate(-490, 0, 45)).translate(0, 0, -21).scale(scale).color(ropeFiber));
p.part("side-right", (cylinder(580, 16, 8).translate(490, 0, 45)).translate(0, 0, -21).scale(scale).color(ropeFiber));
p.part("net-1", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(-320, 0, 330)).translate(0, 0, -21).scale(scale).color(nylonNetting));
p.part("net-2", (box(10, 12, 600, true).rotate([0, 1, 0], -42).translate(-160, 0, 330)).translate(0, 0, -21).scale(scale).color(nylonNetting));
p.part("net-3", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(0, 0, 330)).translate(0, 0, -21).scale(scale).color(nylonNetting));
p.part("net-4", (box(10, 12, 600, true).rotate([0, 1, 0], -42).translate(160, 0, 330)).translate(0, 0, -21).scale(scale).color(nylonNetting));
p.part("net-5", (box(10, 12, 600, true).rotate([0, 1, 0], 42).translate(320, 0, 330)).translate(0, 0, -21).scale(scale).color(nylonNetting));

return p.model();
