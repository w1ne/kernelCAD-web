// Original kernelCAD low-poly window for interior walls: a frame with
// mullions and transom over tinted glass panes, a deep sill and optional
// curtains on a rod. Origin 'wall': the back sits on the y = 0 wall plane,
// parts project toward -Y, centred on x = 0 with the glass centre at z = 0.

meta({
  name: 'window',
  license: 'CC0-1.0',
  title: 'Window',
  description: 'Interior window with a painted frame, mullions, glass panes, a sill and optional curtains on a rod. Knobs: width, panes, curtains, frame, glass, sill, curtain and rod colours.',
  tags: ['window', 'casement', 'glass', 'curtains', 'drapes', 'sill', 'wall'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'living-room', 'bedroom', 'kitchen', 'office'],
  triangleBudget: 400,
});

const width = param('width', '1200', { choices: ['800', '1200', '1600'], label: 'Width (mm)' });
const panes = param('panes', '2', { choices: ['1', '2', '3'], label: 'Panes across' });
const curtains = param('curtains', 'yes', { choices: ['yes', 'no'], label: 'Curtains' });
const frame = param('frame', '#f2f1ec', { label: 'Frame' });
const glass = param('glass', '#a9cbe0', { label: 'Glass' });
const sill = param('sill', '#d9d4c7', { label: 'Sill' });
const cloth = param('cloth', '#b8584a', { label: 'Curtains' });
const rod = param('rod', '#2b2927', { label: 'Rod' });

presets({
  oak: { frame: '#b98a5a', sill: '#8a6a48', cloth: '#5c7a8a' },
  dark: { frame: '#2b2d30', cloth: '#d9cfbd', rod: '#b8913f' },
  night: { glass: '#2f3e57' },
});

const W = Number(width.value);
const n = Number(panes.value);
const H = 1300;
const fw = 60; // frame width
const fd = 60; // frame depth from the wall
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const w = assembly('window');
// Glass sits slightly recessed; the frame ring and bars stand proud.
w.part('glass', blk(-W / 2 + fw - 1, -20, -H / 2 + fw - 1, W / 2 - fw + 1, 0, H / 2 - fw + 1).color(glass));
w.part('frame', blk(-W / 2, -fd, -H / 2, W / 2, 0, H / 2)
  .subtract(blk(-W / 2 + fw, -fd - 10, -H / 2 + fw, W / 2 - fw, 10, H / 2 - fw)).color(frame));
const tz = H / 2 - fw - (H - 2 * fw) * 0.3;
w.part('transom', blk(-W / 2 + fw - 1, -fd + 15, tz - 20, W / 2 - fw + 1, -19, tz + 20).color(frame));
for (let i = 1; i < n; i++) {
  const x = -W / 2 + fw + ((W - 2 * fw) * i) / n;
  w.part(`mullion-${i}`, blk(x - 20, -fd + 15, -H / 2 + fw - 1, x + 20, -19, tz - 19).color(frame));
}
w.part('sill', blk(-W / 2 - 60, -fd - 110, -H / 2 - 50, W / 2 + 60, 0, -H / 2 + 1).color(sill));
if (curtains.value === 'yes') {
  const rz = H / 2 + 120;
  w.part('rod', blk(-W / 2 - 280, -240, rz - 12, W / 2 + 280, -216, rz + 12).color(rod));
  w.part('bracket-left', blk(-W / 2 - 200, -240, rz - 10, -W / 2 - 180, 0, rz + 10).color(rod));
  w.part('bracket-right', blk(W / 2 + 180, -240, rz - 10, W / 2 + 200, 0, rz + 10).color(rod));
  // Each curtain: a pleated zig-zag panel hanging from the rod to below the sill.
  const cw = W * 0.32;
  const ch = H + 450;
  const folds = 5;
  const prof: [number, number][] = [];
  for (let k = 0; k <= folds * 2; k++) prof.push([(cw * k) / (folds * 2), k % 2 === 0 ? 0 : 50]);
  for (let k = folds * 2; k >= 0; k--) prof.push([(cw * k) / (folds * 2), (k % 2 === 0 ? 0 : 50) + 18]);
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -W / 2 - 230 : W / 2 + 230 - cw;
    w.part(`curtain-${sx < 0 ? 'left' : 'right'}`, extrudePolygon(prof, ch).translate(x0, -270, rz - ch + 10).color(cloth));
  }
}

return w.model();
