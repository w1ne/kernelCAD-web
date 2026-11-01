// Original kernelCAD low-poly ticket machine: a pay station cabinet on a
// plinth with a visor hood, dark screen, angled keypad, card slot and ticket
// tray. Millimetres, Z up, front faces -Y.

meta({
  name: 'ticket-machine',
  license: 'CC0-1.0',
  title: 'Ticket machine',
  description: 'Parking and transit pay station with a hooded screen, keypad ledge, card slot and ticket tray. Knobs: body, panel and accent colours.',
  tags: ['ticket machine', 'pay station', 'parking', 'transit', 'kiosk', 'machine', 'station', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'parking', 'station'],
  triangleBudget: 220,
});

const body = param('body', '#2a5ea8', { label: 'Body' });
const panel = param('panel', '#1d2024', { label: 'Screen and slots' });
const accent = param('accent', '#f2c418', { label: 'Accent band' });

presets({
  grey: { body: '#7d8288', accent: '#2fbf5a' },
  red: { body: '#b8261e', accent: '#f2f2ee' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const tm = assembly('ticket-machine');
tm.part('plinth', blk(-300, -225, 0, 300, 225, 80).color(panel));
tm.part('cabinet', blk(-260, -190, 80, 260, 190, 1500).color(body));
tm.part('hood', sideProfile([[-330, 1440], [200, 1500], [200, 1580], [-330, 1520]], -280, 560).color(body));
tm.part('band', blk(-280, -340, 1425, 280, -325, 1530).color(accent));
tm.part('screen', blk(-200, -198, 1130, 200, -189, 1340).color(panel));
tm.part('keypad', box(360, 150, 40, true).rotateX(-30).translate(0, -230, 1020).color(panel));
tm.part('card-slot', blk(80, -200, 880, 200, -189, 910).color(accent));
tm.part('tray', blk(-180, -205, 520, 180, -189, 680).color(panel));
tm.part('coin-slot', blk(-170, -200, 880, -60, -189, 910).color(panel));

return tm.model();
