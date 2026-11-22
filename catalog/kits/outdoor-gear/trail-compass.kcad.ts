// Original low-poly hiking compass with a baseplate and readable needle.
// Millimetres, Z up.

meta({
  name: 'trail-compass',
  license: 'CC0-1.0',
  title: 'Trail compass',
  description: 'Handheld baseplate compass with a raised dial, direction needle, bezel and sighting mark. Knobs: plate style, case, dial and needle colours.',
  tags: ['compass', 'navigation', 'baseplate', 'camping', 'hiking', 'trail'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'center',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 220,
});

const style = param('style', 'baseplate', { choices: ['baseplate', 'round'], label: 'Plate style' });
const caseColor = param('caseColor', '#55755c', { label: 'Case' });
const dial = param('dial', '#e1ddc8', { label: 'Dial' });
const needle = param('needle', '#bd4935', { label: 'Needle' });
presets({
  field: { caseColor: '#55755c', dial: '#e1ddc8', needle: '#bd4935' },
  rescue: { caseColor: '#c84e35', dial: '#ebe6d6', needle: '#303b3f' },
});

const compass = assembly('trail-compass');
if (style.value === 'round') {
  compass.part('round-case', cylinder(34, 112, 12).translate(0, 0, 0).color(caseColor));
} else {
  compass.part('baseplate', box(190, 270, 28, true).translate(0, 0, 12).color(caseColor));
  compass.part('sighting-tab', box(72, 66, 24, true).translate(0, 146, 12).color(caseColor));
}
compass.part('bezel', cylinder(28, 74, 12).translate(0, 16, 28).color(caseColor));
compass.part('dial-face', cylinder(12, 62, 12).translate(0, 16, 54).color(dial));
compass.part('needle-north', extrudePolygon([[-12, 16], [0, 82], [12, 16]], 6).translate(0, 0, 62).color(needle));
compass.part('needle-south', extrudePolygon([[-12, 16], [0, -42], [12, 16]], 6).translate(0, 0, 62).color(caseColor));
compass.part('direction-line', box(10, 180, 6, true).translate(0, 16, 34).color(needle));

return compass.model();
