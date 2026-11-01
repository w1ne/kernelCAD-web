// Original kernelCAD low-poly bike share station: a ground rail carrying a row
// of leaning docking posts with lit heads and a payment terminal with screen
// and canopy at one end. Millimetres, Z up, bikes park on the -Y side.

meta({
  name: 'bike-share-dock',
  license: 'CC0-1.0',
  title: 'Bike share dock',
  description: 'Bike sharing station with a terminal, screen and canopy plus a row of docking posts with lit heads on a ground rail. Knobs: docks, frame, accent and panel colours.',
  tags: ['bike share', 'docking station', 'bicycle', 'rental', 'dock', 'terminal', 'transit', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'transit', 'park'],
  triangleBudget: 360,
});

const docks = param('docks', '5', { choices: ['3', '5', '7'], label: 'Docks' });
const frame = param('frame', '#e8e8e4', { label: 'Frame' });
const accent = param('accent', '#2a7fc8', { label: 'Accent and lights' });
const panel = param('panel', '#2a2c2e', { label: 'Rail, screen and slots' });

presets({
  red: { accent: '#c8261e' },
  green: { accent: '#2fbf5a', frame: '#3a3f45' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const n = Number(docks.value);
const pitch = 750;
const termW = 500;
const L = n * pitch + termW + 200;
const x0 = -L / 2;
const bd = assembly('bike-share-dock');
bd.part('rail', blk(x0, -170, 0, L / 2, 170, 60).color(panel));
// Terminal at the -X end.
const tx = x0 + 100;
bd.part('terminal', blk(tx, -180, 55, tx + termW, 180, 1900).color(frame));
bd.part('screen', blk(tx + 60, -190, 1250, tx + termW - 60, -179, 1600).color(panel));
bd.part('keypad', blk(tx + 120, -230, 1080, tx + termW - 120, -179, 1180).color(panel));
bd.part('canopy', sideProfile([[-400, 1880], [260, 1960], [260, 2020], [-400, 1960]], tx - 60, termW + 120).color(accent));
bd.part('map-panel', blk(tx + 40, 179, 400, tx + termW - 40, 190, 1600).color(accent));
for (let i = 0; i < n; i++) {
  const x = tx + termW + 250 + i * pitch;
  bd.part(`dock-${i + 1}`, sideProfile([[-50, 50], [110, 50], [40, 880], [-120, 880]], x - 60, 120).color(frame));
  bd.part(`dock-head-${i + 1}`, blk(x - 70, -200, 760, x + 70, -40, 900).color(accent));
  bd.part(`dock-slot-${i + 1}`, blk(x - 30, -230, 450, x + 30, -60, 600).rotateX(-5).color(panel));
}

return bd.model();
