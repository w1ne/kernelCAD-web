// Original kernelCAD low-poly picture frame for hanging on a wall. Origin
// 'wall': the back sits on the y = 0 wall plane, the frame projects toward -Y,
// centred on x = 0 with its centre at z = 0. Millimetres, Z up.

meta({
  name: 'picture-frame',
  license: 'CC0-1.0',
  title: 'Picture frame',
  description: 'Wall-hung picture frame with a mat and a simple abstract picture, in portrait or landscape. Knobs: size, orientation, frame, mat and picture colours.',
  tags: ['picture frame', 'frame', 'painting', 'art', 'wall art', 'poster', 'decor'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'living-room', 'bedroom', 'office', 'kitchen'],
  triangleBudget: 150,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const orient = param('orientation', 'landscape', { choices: ['landscape', 'portrait'], label: 'Orientation' });
const frame = param('frame', '#2b2927', { label: 'Frame' });
const mat = param('mat', '#f3f0e8', { label: 'Mat' });
const art = param('art', '#3c6e8f', { label: 'Picture' });
const accent = param('accent', '#d9a441', { label: 'Picture accent' });

presets({
  oak: { frame: '#b98a5a', art: '#5c8f6a', accent: '#e0c27a' },
  gold: { frame: '#b8913f', art: '#7a2f35', accent: '#2c3e57' },
});

const base = size.value === 'small' ? 300 : size.value === 'medium' ? 500 : 800;
const long = base;
const short = base * 0.75;
const W = orient.value === 'landscape' ? long : short;
const H = orient.value === 'landscape' ? short : long;
const fw = base * 0.07; // moulding width
const fd = 30; // projection from the wall

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const p = assembly('picture-frame');
p.part('frame-top', blk(-W / 2, -fd, H / 2 - fw, W / 2, 0, H / 2).color(frame));
p.part('frame-bottom', blk(-W / 2, -fd, -H / 2, W / 2, 0, -H / 2 + fw).color(frame));
p.part('frame-left', blk(-W / 2, -fd, -H / 2 + fw, -W / 2 + fw, 0, H / 2 - fw).color(frame));
p.part('frame-right', blk(W / 2 - fw, -fd, -H / 2 + fw, W / 2, 0, H / 2 - fw).color(frame));
// The mat is a border around the picture, so no face hides behind another.
const m = base * 0.08;
const ax0 = -W / 2 + fw + m;
const ax1 = W / 2 - fw - m;
const az0 = -H / 2 + fw + m;
const az1 = H / 2 - fw - m;
p.part('mat-top', blk(-W / 2 + fw - 1, -fd + 12, az1, W / 2 - fw + 1, 0, H / 2 - fw + 1).color(mat));
p.part('mat-bottom', blk(-W / 2 + fw - 1, -fd + 12, -H / 2 + fw - 1, W / 2 - fw + 1, 0, az0).color(mat));
p.part('mat-left', blk(-W / 2 + fw - 1, -fd + 12, az0, ax0, 0, az1).color(mat));
p.part('mat-right', blk(ax1, -fd + 12, az0, W / 2 - fw + 1, 0, az1).color(mat));
// The picture: a field with a low-poly hill and a sun.
// Sky and hill are two complementary polygons in one plane.
const hz = (f: number) => az0 + (az1 - az0) * f;
const hx = (f: number) => ax0 + (ax1 - ax0) * f;
const sky = extrudePolygon([[ax0, hz(0.25)], [hx(0.55), hz(0.6)], [ax1, hz(0.3)], [ax1, az1], [ax0, az1]], 10)
  .rotateX(90).translate(0, -fd + 18, 0);
p.part('picture-sky', sky.color(art));
const hill = extrudePolygon([[ax0, az0], [ax1, az0], [ax1, hz(0.3)], [hx(0.55), hz(0.6)], [ax0, hz(0.25)]], 10)
  .rotateX(90).translate(0, -fd + 18, 0);
p.part('picture-hill', hill.color(accent));

return p.model();
