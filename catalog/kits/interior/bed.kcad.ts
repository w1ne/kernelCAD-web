// Original kernelCAD low-poly bed: wooden frame, headboard, mattress, folded
// blanket and pillows. Headboard at +Y, foot of the bed toward -Y.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'bed',
  license: 'CC0-1.0',
  title: 'Bed',
  description: 'Single or double bed with a wooden frame and headboard, mattress, blanket and pillows. Knobs: size, frame, sheet and blanket colours.',
  tags: ['bed', 'double bed', 'single bed', 'mattress', 'bedroom', 'sleep'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom'],
  triangleBudget: 250,
});

const size = param('size', 'double', { choices: ['single', 'double'], label: 'Size' });
const frame = param('frame', '#a07548', { label: 'Frame' });
const sheets = param('sheets', '#eeeae2', { label: 'Sheets and pillows' });
const blanket = param('blanket', '#4f6f8f', { label: 'Blanket' });

presets({
  walnut: { frame: '#5a3a27', blanket: '#b9704a' },
  white: { frame: '#ecebe6', blanket: '#8fa58a' },
  dark: { frame: '#2b2927', sheets: '#c9c6c0', blanket: '#7a2f35' },
});

const mw = size.value === 'single' ? 900 : 1600; // mattress width
const ml = 2000;
const rail = 40;
const W = mw + 2 * rail;
const L = ml + 2 * rail;
const frameTop = 380;
const mattTop = 580;
const headH = 1050;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const bed = assembly('bed');
const y0 = -L / 2;
const y1 = L / 2;
const lw = 70;
bed.part('leg-left', blk(-W / 2, y0, 0, -W / 2 + lw, y0 + lw, frameTop).color(frame));
bed.part('leg-right', blk(W / 2 - lw, y0, 0, W / 2, y0 + lw, frameTop).color(frame));
bed.part('headboard', blk(-W / 2, y1 - 60, 0, W / 2, y1, headH).color(frame));
bed.part('side-left', blk(-W / 2, y0 + lw - 1, 180, -W / 2 + rail, y1 - 59, frameTop).color(frame));
bed.part('side-right', blk(W / 2 - rail, y0 + lw - 1, 180, W / 2, y1 - 59, frameTop).color(frame));
bed.part('foot-rail', blk(-W / 2 + lw - 1, y0, 180, W / 2 - lw + 1, y0 + rail, frameTop).color(frame));
bed.part('mattress', blk(-mw / 2, y0 + rail, 300, mw / 2, y1 - 60, mattTop).color(sheets));
// Blanket drapes over the lower two thirds of the mattress.
bed.part('blanket', blk(-mw / 2 - 15, y0 + rail - 15, 380, mw / 2 + 15, y0 + rail + ml * 0.66, mattTop + 25).color(blanket));
bed.part('blanket-fold', blk(-mw / 2 - 15, y0 + rail + ml * 0.6, mattTop + 20, mw / 2 + 15, y0 + rail + ml * 0.72, mattTop + 55).color(sheets));
const nP = size.value === 'single' ? 1 : 2;
const pw = (mw - 120) / nP;
for (let i = 0; i < nP; i++) {
  const px = -mw / 2 + 60 + i * pw;
  bed.part(`pillow-${i + 1}`, blk(px + 15, y1 - 60 - 420, mattTop - 5, px + pw - 15, y1 - 80, mattTop + 130).color(sheets));
}

return bed.model();
