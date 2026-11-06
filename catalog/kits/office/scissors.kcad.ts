// Office scissors: Desktop office scissors with crossed blades, pivot and contrasting handles. Material controls: stainless steel, handle polymer, pivot brass.

meta({
  name: 'scissors',
  license: 'CC0-1.0',
  title: 'Office scissors',
  description: "Desktop office scissors with crossed blades, pivot and contrasting handles. Controls: stainless steel, handle polymer, pivot brass.",
  tags: ['scissors', 'shears', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 280,
});

const stainlessSteel = param('stainlessSteel', '#aeb7ba', { label: 'Stainless steel' });
const polymer = param('polymer', '#c95045', { label: 'Handle polymer' });
const brass = param('brass', '#c19a4b', { label: 'Pivot brass' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { stainlessSteel: '#aeb7ba', polymer: '#c95045', brass: '#c19a4b' },
  classroom: { stainlessSteel: '#c0c6c8', polymer: '#4f7992', brass: '#d2a548' },
});

const office = assembly('scissors');

const blade = (name: string, outline: [number, number][], z: number) =>
  office.part(name, extrudePolygon(outline, 3 * k).translate(0, 0, z * k).color(stainlessSteel));

// The two blades open into a shallow V, with both finger loops behind the pivot.
blade('lower-blade', [[27, -2], [-106, -31], [-85, -19], [27, 2]], 0);
blade('upper-blade', [[27, 2], [-106, 31], [-85, 19], [27, -2]], 3);

const fingerLoop = (x: number, y: number) =>
  cylinder(8 * k, 19 * k).subtract(cylinder(10 * k, 11 * k)).translate(x * k, y * k, 0);
office.part('thumb-loop', fingerLoop(65, -20).color(polymer));
office.part('finger-loop', fingerLoop(65, 20).color(polymer));
office.part('pivot', cylinder(9 * k, 8 * k).translate(27 * k, 0, 0).color(brass));

return office.model();
