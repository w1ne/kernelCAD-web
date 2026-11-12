// Illustrative CC0 cast flange housing with an unobstructed shaft bore,
// two clear fastener holes, and a separate plain bronze sleeve bearing.
meta({
  name: 'flange-bearing-housing',
  license: 'CC0-1.0',
  title: 'Flange bearing housing',
  description: 'Illustrative CC0 flange bearing housing: one-piece cast housing with a raised circular seat, two usable through-holes, and a separate plain bronze sleeve bearing with an open shaft bore. Not a ball bearing, vendor drawing, rated part, or fit specification. Knobs: model size and display colors.',
  tags: ['bearing housing', 'flange bearing', 'shaft support', 'mount'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
presets({
  dark: { castIron: '#3b4246', bronze: '#684d37' },
  brass: { castIron: '#69645b', bronze: '#b0804d' },
  weathered: { castIron: '#4d4b46', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
// Nominal illustrative dimensions at 1x: 56 x 36 x 20 mm overall.
// The 15 mm-radius boss clears both Ø7 mounting bores at X=±21 mm.
// Cast housing, replaceable bronze bushing and the shaft passage are
// distinct functional structures rather than decorative surface colors.
const a = assembly('flange-bearing-housing');
const plate = box(56*s, 36*s, 8*s).translate(-28*s, -18*s, 0);
const boss = cylinder(12.1*s, 15*s, 24).translate(0, 0, 7.9*s);
let casting = plate.union(boss);
// Ø23 through-seat, open from the underside to the upper crown.
casting = casting.subtract(cylinder(22*s, 11.5*s, 24).translate(0, 0, -s));
for (const x of [-21, 21]) {
  casting = casting.subtract(cylinder(10*s, 3.5*s, 20).translate(x*s, 0, -s));
}
a.part('one-piece-cast-iron-housing', casting.color(castIron));
// Replaceable plain bearing: separate solid with nominal 0.2 mm radial
// clearance to the cast seat, not an invented ball race or rolling element.
const sleeve = cylinder(20*s, 11.3*s, 24)
  .subtract(cylinder(22*s, 8.5*s, 24).translate(0, 0, -s));
a.part('plain-bronze-sleeve-bearing', sleeve.color(bronze));
return a.model();
