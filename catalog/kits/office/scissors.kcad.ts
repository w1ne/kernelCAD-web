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
  triangleBudget: 360,
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
const handleTang = (name: string, side: 1 | -1, z: number) => {
  const outline: [number, number][] = side === 1
    ? [[24, -2], [42, 5], [51, 10], [58, 16], [55, 23], [49, 19], [42, 13], [26, 2]]
    : [[24, 2], [42, -5], [51, -10], [58, -16], [55, -23], [49, -19], [42, -13], [26, -2]];
  office.part(name, extrudePolygon(outline, 4 * k).translate(0, 0, z * k).color(polymer));
};

// The two blades open into a shallow V, with both finger loops behind the pivot.
blade('lower-blade', [[27, -2], [-106, -31], [-85, -19], [27, 2]], 0);
blade('upper-blade', [[27, 2], [-106, 31], [-85, 19], [27, -2]], 3);

// Molded handle tangs bridge each finger loop back to the pivot, so the preview
// reads as one usable pair of shears instead of disconnected rings and blades.
handleTang('lower-handle-tang', -1, 0);
handleTang('upper-handle-tang', 1, 4);

const fingerLoop = (x: number, y: number) =>
  cylinder(8 * k, 19 * k).subtract(cylinder(10 * k, 11 * k)).translate(x * k, y * k, 0);
office.part('thumb-loop', fingerLoop(65, -20).color(polymer));
office.part('finger-loop', fingerLoop(65, 20).color(polymer));
office.part('pivot', cylinder(9 * k, 8 * k).translate(27 * k, 0, 0).color(brass));

return office.model();
