// SPDX-License-Identifier: CC0-1.0
// Four separate parts of an illustrative straight pipe union: inlet and
// outlet tailpieces, the removable hex coupling nut, and a gasket captured
// between the opposed ends. Threads and sealing fits are NOT modeled; this
// is low-poly scene geometry, not a pressure-rated or fabrication-ready part.
meta({
  name: 'pipe-union',
  license: 'CC0-1.0',
  title: 'Pipe union',
  description: 'Illustrative CC0 low-poly straight pipe union: two detachable tubular tailpieces with external shoulders, a hollow six-flat coupling nut that captures them, and a separate sealing gasket between faces. The central fluid passage is open. Three scaled scene sizes; threaded engagement, pressure rating and leak-tight fit are not verified manufacturing details.',
  tags: ['pipe union', 'union fitting', 'pipe connector', 'plumbing', 'low poly', 'scene prop', 'CC0'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 800,
});
const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative overall scale' });
const steel = param('steel', '#85929a', { label: 'Steel tailpieces' });
const brass = param('brass', '#b28a4d', { label: 'Brass coupling nut' });
const gasketColor = param('gasketColor', '#353d41', { label: 'Sealing gasket' });
presets({
  dark: { steel: '#3e484e', brass: '#725938' },
  brass: { steel: '#646f75', brass: '#c0944d' },
  weathered: { steel: '#665b4d', brass: '#8c734d' },
});
const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const tube = (lo: number, hi: number, ro: number, ri = 9) =>
  cylinder((hi-lo)*s, ro*s, 12).translate(0,0,lo*s)
    .subtract(cylinder((hi-lo+2)*s, ri*s, 12).translate(0,0,(lo-1)*s));

// The lower tailpiece has a full-size pipe, a raised retaining shoulder and
// a smaller spigot which fits inside the nut without intersecting its bore.
const inlet = tube(0, 15, 15).union(tube(11, 15, 18))
  .union(tube(14, 22.5, 12.5));
// The upper tailpiece presents the mating spigot to the face gasket. The
// shoulders remain outside the nut so the collar captures each tailpiece.
const outlet = tube(23.5, 34, 12.5).union(tube(33, 37, 18))
  .union(tube(36, 49, 15));
const hexPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (i + 0.5) * Math.PI / 3;
  return [22 * Math.cos(angle)*s, 22 * Math.sin(angle)*s];
});
// Across-flats ~= 38.1 mm at default scale. Hollow: neither a solid block
// nor a squared-off sleeve masquerading as a pipe union.
const nut = extrudePolygon(hexPoints, 18*s).translate(0,0,15*s)
  .subtract(cylinder(20*s, 13.4*s, 12).translate(0,0,14*s));
// Replaceable, visible in an exploded view; outer radius stays below the
// coupling nut bore and the central 18 mm fluid passage is uninterrupted.
const gasket = tube(22.5, 23.5, 12.7, 9.05);
const a = assembly('pipe-union');
a.part('inlet-tailpiece', inlet.color(steel));
a.part('coupling-hex-nut', nut.color(brass));
a.part('face-gasket', gasket.color(gasketColor));
a.part('outlet-tailpiece', outlet.color(steel));
return a.model();
