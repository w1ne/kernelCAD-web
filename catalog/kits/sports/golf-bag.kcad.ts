// Golf Bag: Upright golf bag with a broad lower body, tapered-looking rim and club tops. Low-poly sports prop in millimetres, Z up; materials: bag nylon fabric, rim aluminium, club steel, strap webbing.
meta({
  name: 'golf-bag',
  license: 'CC0-1.0',
  title: 'Golf bag',
  description: "Upright golf bag with a broad lower body, tapered-looking rim and club tops. Material controls: bag nylon fabric, rim aluminium, club steel, strap webbing.",
  tags: ['golf bag', 'golf', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const nylonFabric = param('nylonFabric', '#42675d', { label: 'Bag nylon fabric' });
const rimAluminium = param('rimAluminium', '#aab4b5', { label: 'Rim aluminium' });
const clubSteel = param('clubSteel', '#8b969a', { label: 'Club steel' });
const strapWebbing = param('strapWebbing', '#c2b9a3', { label: 'Strap webbing' });
presets({ clubColors: { nylonFabric: '#bd5e40', rimAluminium: '#aab4b5' } });
const p = assembly('golf-bag');
p.part('bag-body', cylinder(380, 65, 12).translate(0, 0, 0).scale(scale).color(nylonFabric));
p.part('base', cylinder(24, 76, 12).translate(0, 0, 0).scale(scale).color(nylonFabric));
p.part('rim', cylinder(14, 72, 12).translate(0, 0, 380).scale(scale).color(rimAluminium));
p.part('club-a', cylinder(180, 5, 8).translate(-28, -15, 392).scale(scale).color(clubSteel));
p.part('club-b', cylinder(195, 5, 8).translate(0, 0, 392).scale(scale).color(clubSteel));
p.part('club-c', cylinder(170, 5, 8).translate(28, 15, 392).scale(scale).color(clubSteel));
p.part('strap', box(14, 40, 260, true).translate(68, 0, 190).scale(scale).color(strapWebbing));


// Three low-profile clubs remain visible above the bag rim as distinct metal heads.
for (let i = 0; i < 3; i++) p.part(`club-head-${i + 1}`, box(18, 10, 8, true).translate(-28 + i * 28, -15 + i * 15, 570 + i * 6).color(clubSteel));

return p.model();
