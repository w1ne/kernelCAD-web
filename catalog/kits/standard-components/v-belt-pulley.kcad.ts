// Two actual tapered V grooves and a continuous bore; CC0 illustrative, not a rated drive sheave.
meta({
  name: 'v-belt-pulley',
  license: 'CC0-1.0',
  title: 'V-belt pulley',
  description: 'Illustrative CC0 double-V belt pulley with two tapered annular grooves, a continuous 14 mm shaft bore and a distinct steel bushing envelope. The two illustrative V sections have approximately 41-degree included angles. Not manufacturer-grade CAD: belt section, bushing fit, keyway, tolerances, torque and load ratings are not specified. Knobs change model size and appearance colors only.',
  tags: ['v-belt pulley', 'sheave', 'belt drive', 'shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Bushing appearance color' });
const castIron = param('castIron', '#68747a', { label: 'Sheave appearance color' });
presets({
  dark: { steel: '#3e484e', castIron: '#3b4246' },
  brass: { steel: '#646f75', castIron: '#69645b' },
  weathered: { steel: '#665b4d', castIron: '#4d4b46' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('v-belt-pulley');
// A closed radial/axial profile revolves about the shaft (Z) axis.
// 36 mm rim radius; two 12 mm-deep roots at z=11 and z=29 mm.
// Their 9 mm mouths give about a 41-degree included V angle. This is not an ISO belt profile.
const turn = (points: [number, number][]) => {
  let profile = path().moveTo(points[0][0] * s, points[0][1] * s);
  for (const [radius, z] of points.slice(1)) profile = profile.lineTo(radius * s, z * s);
  return profile.close().revolve();
};
// The shell is one connected piece, not three stacked cylinders imitating grooves.
// The 0.05 mm radial clearance to the insert is illustrative, not a rated fit.
a.part('double-v-sheave', turn([
  [11.05, 2], [36, 2], [36, 6.5], [24, 11], [36, 15.5],
  [36, 24.5], [24, 29], [36, 33.5], [36, 38], [11.05, 38],
]).color(castIron));
// Physically distinct through-bore bushing, slightly proud at both axial ends.
a.part('steel-bushing-envelope', turn([
  [7, 0], [11, 0], [11, 40], [7, 40],
]).color(steel));
return a.model();
