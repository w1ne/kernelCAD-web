// Original kernelCAD low-poly media unit: low TV cabinet with doors and a drawer,
// carrying a flat-screen TV on a pedestal foot. Screen faces -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'tv-stand-with-tv',
  license: 'CC0-1.0',
  title: 'TV stand with TV',
  description: 'Low media cabinet with doors and a drawer, carrying a flat-screen television. Knobs: screen size, cabinet, door and TV colours.',
  tags: ['tv', 'television', 'tv stand', 'media console', 'entertainment unit', 'living room', 'screen'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 250,
});

const screen = param('screenIn', '55', { choices: ['43', '55', '65'], label: 'Screen (in)' });
const cabinet = param('cabinet', '#6b4630', { label: 'Cabinet' });
const doors = param('doors', '#e3ddd0', { label: 'Doors' });
const tv = param('tv', '#1a1a1c', { label: 'TV frame' });
const glass = param('glass', '#26303a', { label: 'Screen' });

presets({
  oak: { cabinet: '#b98a5a', doors: '#3a3735' },
  white: { cabinet: '#ecebe6', doors: '#d7d5cf', tv: '#2a2a2c' },
});

// 16:9 panel from the diagonal.
const diag = Number(screen.value) * 25.4;
const sw = (diag * 16) / Math.hypot(16, 9);
const sh = (diag * 9) / Math.hypot(16, 9);
const W = Math.max(1600, Math.ceil(sw / 100) * 100 + 200);
const D = 420;
const H = 480;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const unit = assembly('tv-stand-with-tv');
unit.part('plinth', blk(-W / 2 + 40, -D / 2 + 30, 0, W / 2 - 40, D / 2 - 20, 61).color(doors));
// Open-front carcass: sides, back, top, bottom and two dividers around the middle bay.
unit.part('side-left', blk(-W / 2, -D / 2 + 18, 60, -W / 2 + 18, D / 2, H).color(cabinet));
unit.part('side-right', blk(W / 2 - 18, -D / 2 + 18, 60, W / 2, D / 2, H).color(cabinet));
unit.part('top', blk(-W / 2 + 17, -D / 2 + 18, H - 25, W / 2 - 17, D / 2, H).color(cabinet));
unit.part('bottom', blk(-W / 2 + 17, -D / 2 + 18, 60, W / 2 - 17, D / 2, 78).color(cabinet));
unit.part('back', blk(-W / 2 + 17, D / 2 - 12, 77, W / 2 - 17, D / 2, H - 24).color(cabinet));
// Two doors either side of a low middle drawer under an open top bay.
const bay = W / 3;
unit.part('divider-left', blk(-bay / 2 - 4, -D / 2 + 18, 77, -bay / 2 + 14, D / 2 - 11, H - 24).color(cabinet));
unit.part('divider-right', blk(bay / 2 - 14, -D / 2 + 18, 77, bay / 2 + 4, D / 2 - 11, H - 24).color(cabinet));
unit.part('door-left', blk(-W / 2 + 2, -D / 2, 62, -bay / 2 - 2, -D / 2 + 19, H - 2).color(doors));
unit.part('door-right', blk(bay / 2 + 2, -D / 2, 62, W / 2 - 2, -D / 2 + 19, H - 2).color(doors));
unit.part('drawer', blk(-bay / 2 + 2, -D / 2, 62, bay / 2 - 2, -D / 2 + 19, 230).color(doors));
// TV: pedestal foot, neck, panel and screen face.
const tvZ = H + 60;
unit.part('tv-foot', blk(-180, -80, H - 1, 180, 140, H + 15).color(tv));
unit.part('tv-neck', blk(-30, 39, H + 14, 30, 70, tvZ + sh * 0.3).color(tv));
unit.part('tv-panel', blk(-sw / 2 - 10, -20, tvZ, sw / 2 + 10, 40, tvZ + sh + 20).color(tv));
unit.part('tv-screen', blk(-sw / 2, -26, tvZ + 10, sw / 2, -19, tvZ + sh + 10).color(glass));

return unit.model();
