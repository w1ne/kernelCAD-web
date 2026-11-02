// Original kernelCAD compact runabout with open and cuddy-cabin layouts.

meta({
  name: 'motorboat', license: 'CC0-1.0', title: 'Compact motorboat',
  description: 'Small runabout with a pointed bow, raised deck and outboard engine, with open or cuddy-cabin layout. Knobs: style, hull, deck, cabin and accent colours.',
  tags: ['motorboat', 'runabout', 'outboard', 'watercraft', 'lake', 'coastal'], kit: 'watercraft', category: 'vehicle', origin: 'base',
  compat: ['water', 'lake', 'coastal', 'harbor'], triangleBudget: 540,
});

const style = param('style', 'open', { choices: ['open', 'cuddy'], label: 'Deck layout' });
const hullColor = param('hull', '#31576c', { label: 'Hull' });
const deck = param('deck', '#e9e2cf', { label: 'Deck' });
const cabin = param('cabin', '#c17b44', { label: 'Cabin' });
const accent = param('accent', '#313d42', { label: 'Engine and trim' });
presets({ harbor: { hull: '#31576c', deck: '#e9e2cf' }, sport: { hull: '#d44d37', deck: '#f0e7d2' } });

const boat = assembly('motorboat');
const outline = extrudePolygon([
  [0, 1450], [260, 1120], [430, 500], [460, -850], [350, -1450],
  [-350, -1450], [-460, -850], [-430, 500], [-260, 1120],
], 190).translate(0, 0, 0);
boat.part('hull', outline.color(hullColor));
boat.part('deck', extrudePolygon([
  [0, 1360], [235, 1020], [380, 420], [390, -780], [310, -1320],
  [-310, -1320], [-390, -780], [-380, 420], [-235, 1020],
], 52).translate(0, 0, 190).color(deck));
boat.part('bow-rail', box(34, 520, 28, true).rotateZ(90).translate(0, 1020, 255).color(accent));
boat.part('windshield', box(18, 580, 210, true).rotateX(-15).translate(0, 360, 350).color(accent));
if (style.value === 'cuddy') {
  boat.part('cuddy-cabin', box(350, 510, 330, true).translate(0, 450, 380).color(cabin));
  boat.part('cabin-window', box(24, 345, 125, true).translate(0, 450, 465).color(accent));
  boat.part('cabin-roof', box(410, 570, 48, true).translate(0, 440, 570).color(deck));
} else {
  boat.part('console', box(250, 240, 270, true).translate(0, 100, 350).color(cabin));
  boat.part('console-screen', box(18, 140, 100, true).translate(0, -12, 390).color(accent));
}
boat.part('stern-seat', box(600, 200, 100, true).translate(0, -1080, 250).color(cabin));
boat.part('outboard-mount', box(170, 110, 230, true).translate(0, -1390, 115).color(accent));
boat.part('outboard-leg', cylinder(300, 34, 8).translate(0, -1440, 0).color(accent));
boat.part('propeller', box(160, 30, 28, true).translate(0, -1440, 18).color(deck));
return boat.model();
