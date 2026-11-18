// Original kernelCAD low-poly folding screen: three to five hinged panels in
// a zig-zag, each a wooden frame on short feet around a fabric or slatted
// infill. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'room-divider',
  license: 'CC0-1.0',
  title: 'Room divider',
  description: 'Folding room divider screen of three to five hinged panels in a zig-zag, with fabric or slatted infill. Knobs: panels, infill, fold angle, frame and infill colours.',
  tags: ['room divider', 'folding screen', 'privacy screen', 'partition', 'screen', 'shoji'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'living-room', 'office', 'studio'],
  triangleBudget: 600,
});

const panels = param('panels', '4', { choices: ['3', '4', '5'], label: 'Panels' });
const infill = param('infill', 'fabric', { choices: ['fabric', 'slats'], label: 'Infill' });
const fold = param('fold', '30', { choices: ['15', '30', '45'], label: 'Fold angle (deg)' });
const frame = param('frame', '#5a3a27', { label: 'Frame' });
const panelC = param('panel', '#efe6d2', { label: 'Infill' });

presets({
  shoji: { frame: '#c69c6d', panel: '#f6f2e6' },
  black: { frame: '#232323', panel: '#b8584a' },
});

const n = Number(panels.value);
const a = Number(fold.value);
const pw = 450;
const H = 1750;
const fw = 35;
const ft = 30;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const d = assembly('room-divider');
// Panel i spans local x 0..pw, rotated ±a about its hinge edge; hinges chain
// along a zig-zag whose overall run is centred on x = 0.
const step = pw * Math.cos((a * Math.PI) / 180);
const dy = pw * Math.sin((a * Math.PI) / 180);
const run = n * step;
let hx = -run / 2;
let hy = -dy / 2;
for (let i = 0; i < n; i++) {
  const rot = i % 2 === 0 ? a : -a;
  const place = (sh: Shape) => sh.rotateZ(rot).translate(hx, hy, 0);
  const pieces = [
    blk(0, -ft / 2, 40, fw, ft / 2, H),
    blk(pw - fw, -ft / 2, 40, pw, ft / 2, H),
    blk(fw - 1, -ft / 2, H - fw, pw - fw + 1, ft / 2, H),
    blk(fw - 1, -ft / 2, 140, pw - fw + 1, ft / 2, 140 + fw),
    blk(-5, -ft / 2 - 15, 0, fw + 5, ft / 2 + 15, 41),
    blk(pw - fw - 5, -ft / 2 - 15, 0, pw + 5, ft / 2 + 15, 41),
  ];
  pieces.forEach((pc, k) => d.part(`frame-${i + 1}-${k + 1}`, place(pc).color(frame)));
  if (infill.value === 'fabric') {
    d.part(`infill-${i + 1}`, place(blk(fw - 1, -6, 140 + fw - 1, pw - fw + 1, 6, H - fw + 1)).color(panelC));
  } else {
    for (let k = 0; k < 3; k++) {
      const z = 140 + fw + 40 + k * ((H - 140 - 2 * fw - 80) / 2);
      d.part(`slat-${i + 1}-${k + 1}`, place(blk(fw - 1, -4, z - 40, pw - fw + 1, 4, z + 40)).color(panelC));
    }
  }
  hx += step;
  hy += i % 2 === 0 ? dy : -dy;
}

return d.model();
