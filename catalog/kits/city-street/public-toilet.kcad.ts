// Original kernelCAD low-poly public toilet: a self-cleaning street toilet
// cabin with chamfered corners, an overhanging roof, an accent band, a framed
// sliding door and an access ramp. No signs or text. Millimetres, Z up, door
// faces -Y.

meta({
  name: 'public-toilet',
  license: 'CC0-1.0',
  title: 'Public toilet',
  description: 'Automatic street toilet cabin with chamfered corners, roof overhang, accent band, sliding door and ramp. Knobs: body, door, roof and accent colours.',
  tags: ['public toilet', 'toilet', 'restroom', 'wc', 'kiosk', 'cabin', 'amenity', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'park', 'plaza'],
  triangleBudget: 260,
});

const body = param('body', '#4a6b58', { label: 'Body' });
const door = param('door', '#b8bdc2', { label: 'Door' });
const roof = param('roof', '#d8d6d0', { label: 'Roof and ramp' });
const accent = param('accent', '#f2c418', { label: 'Accent band' });

presets({
  grey: { body: '#5d6166', accent: '#2a7fc8' },
  heritage: { body: '#1f3d2b', accent: '#b8902f', door: '#1f3d2b' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const W = 2600;
const D = 1800;
const H = 2500;
// Chamfered rectangle outline grown by e.
const outline = (e: number): [number, number][] => {
  const x = W / 2 + e;
  const y = D / 2 + e;
  const c = 320;
  return [[-x + c, -y], [x - c, -y], [x, -y + c], [x, y - c], [x - c, y], [-x + c, y], [-x, y - c], [-x, -y + c]];
};

const pt = assembly('public-toilet');
pt.part('cabin', extrudePolygon(outline(0), H).color(body));
pt.part('band', extrudePolygon(outline(12), 140).translate(0, 0, H - 300).color(accent));
pt.part('roof', extrudePolygon(outline(140), 120).translate(0, 0, H).color(roof));
pt.part('roof-top', extrudePolygon(outline(-200), 90).translate(0, 0, H + 115).color(roof));
pt.part('door-frame', blk(-560, -D / 2 - 8, 100, 560, -D / 2 + 1, 2250).color(accent));
pt.part('door', blk(-480, -D / 2 - 16, 100, 480, -D / 2 + 1, 2170).color(door));
pt.part('door-seam', blk(-10, -D / 2 - 22, 100, 10, -D / 2 - 10, 2170).color(body));
pt.part('ramp', sideProfile([[-D / 2 - 600, 0], [-D / 2 + 5, 0], [-D / 2 + 5, 100], [-D / 2 - 100, 100]], -700, 1400).color(roof));

return pt.model();
