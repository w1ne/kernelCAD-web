// Original kernelCAD low-poly freestanding dishwasher: a cabinet with a
// control strip and a full-height door that is shut or folded down to show
// the dark tub with two wire racks. Millimetres, Z up, standing on z = 0
// centred on x = y = 0. Front faces -Y.

meta({
  name: 'dishwasher',
  license: 'CC0-1.0',
  title: 'Dishwasher',
  description: 'Freestanding dishwasher with a control strip and a door that is closed or folded open to show two racks with plates. Knobs: door, body, interior, rack, control and plate colours.',
  tags: ['dishwasher', 'dish washer', 'kitchen', 'appliance', 'dishes', 'plates'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen'],
  triangleBudget: 400,
});

const door = param('door', 'closed', { choices: ['closed', 'open'], label: 'Door' });
const body = param('body', '#d9dbdc', { label: 'Body' });
const tub = param('tub', '#4a4f55', { label: 'Interior' });
const rack = param('rack', '#9aa0a6', { label: 'Racks' });
const panel = param('panel', '#2b2d30', { label: 'Controls and handle' });
const plates = param('plates', '#f4f3ef', { label: 'Plates' });

presets({
  white: { body: '#f2f2ef', panel: '#5c6066' },
  black: { body: '#2b2d30', panel: '#c9ccd0' },
});

const W = 600;
const D = 600;
const H = 850;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const d = assembly('dishwasher');
const fy = -D / 2;
const open = door.value === 'open';
const dz0 = 100;
const dt = 50;
// Cabinet with a front cavity; the tub lining sits inside it.
d.part('cabinet', blk(-W / 2, fy + dt, 0, W / 2, D / 2, H)
  .subtract(blk(-W / 2 + 30, fy + dt - 10, dz0, W / 2 - 30, D / 2 - 30, H - 30)).color(body));
d.part('tub', blk(-W / 2 + 29, D / 2 - 31, dz0 - 1, W / 2 - 29, D / 2 - 20, H - 29).color(tub));
d.part('kick', blk(-W / 2 + 10, fy + dt - 5, 0, W / 2 - 10, fy + dt + 1, dz0 - 10).color(panel));
if (!open) {
  d.part('door', blk(-W / 2, fy, dz0 - 5, W / 2, fy + dt + 1, H - 2).color(body));
  d.part('control-strip', blk(-W / 2 + 2, fy - 3, H - 90, W / 2 - 2, fy + 5, H - 6).color(panel));
  d.part('status-light', blk(W / 2 - 120, fy - 6, H - 60, W / 2 - 60, fy - 1, H - 40).color(rack));
  d.part('handle', blk(-200, fy - 30, H - 140, 200, fy - 2, H - 115).color(panel));
} else {
  // Door folded down flat in front of the tub, inner face up.
  d.part('door', blk(-W / 2, fy - (H - dz0) + 5, dz0 - dt, W / 2, fy + dt, dz0 + 1).color(body));
  d.part('door-liner', blk(-W / 2 + 40, fy - (H - dz0) + 60, dz0, W / 2 - 40, fy + 20, dz0 + 10).color(tub));
  d.part('control-strip', blk(-W / 2, fy - (H - dz0) - 3, dz0 - dt - 1, W / 2, fy - (H - dz0) + 90, dz0 - dt + 6).color(panel));
  // Racks: open wire baskets as shallow trays, plates standing in the lower one.
  for (const [name, z] of [['lower', dz0 + 40], ['upper', dz0 + 380]] as const) {
    d.part(`rack-${name}`, blk(-W / 2 + 40, fy + dt + 10, z, W / 2 - 40, D / 2 - 40, z + 120)
      .subtract(blk(-W / 2 + 52, fy + dt + 22, z + 12, W / 2 - 52, D / 2 - 52, z + 200)).color(rack));
  }
  for (let i = 0; i < 6; i++) {
    const y = fy + dt + 80 + i * 60;
    d.part(`plate-${i + 1}`, blk(-120, y, dz0 + 52, 120, y + 12, dz0 + 300).color(plates));
  }
}

return d.model();
