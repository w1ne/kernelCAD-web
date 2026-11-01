// Original kernelCAD low-poly plastic storage tote: a tapered, hollowed box
// with a stepped rim, end hand-grips and a ribbed lid held by two flip
// clips on the short ends, or open with no lid.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, long side along X.

meta({
  name: 'storage-tote',
  license: 'CC0-1.0',
  title: 'Storage tote',
  description: 'Plastic storage tote box with tapered walls, stepped rim, end hand-grips and a clip-on lid, closed or open, single or stacked. Knobs: size, lid, stack, box, lid and clip colours.',
  tags: ['tote', 'storage box', 'plastic box', 'bin', 'container', 'clip lid', 'garage', 'warehouse'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'warehouse', 'garage', 'office', 'house', 'shop'],
  triangleBudget: 440,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const lid = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const stack = param('stack', '1', { choices: ['1', '2'], label: 'Stacked totes' });
const body = param('body', '#d9dde0', { label: 'Box' });
const top = param('top', '#2f6fc0', { label: 'Lid' });
const clip = param('clip', '#f0c23a', { label: 'Clips' });

presets({
  black: { body: '#2e3033', top: '#e8c33a', clip: '#e8c33a' },
  clear: { body: '#e6eef0', top: '#e6eef0', clip: '#2f6fc0' },
  red: { body: '#c8302a', top: '#2a2a2c', clip: '#2a2a2c' },
});

const s = size.value === 'small' ? 0.65 : size.value === 'large' ? 1.3 : 1;
const L = 600 * s;
const W = 400 * s;
const H = 330 * s;
const tap = 30 * s; // inward taper of each wall at the base
const n = Number(stack.value);

const rect = (l: number, w: number) => path().moveTo(-l / 2, -w / 2).lineTo(l / 2, -w / 2).lineTo(l / 2, w / 2).lineTo(-l / 2, w / 2).close();
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const frustum = (l0: number, w0: number, l1: number, w1: number, h: number) => rect(l0, w0).loft(rect(l1, w1), { spacing: h, ruled: true });

// Extra width of the ledge band at fraction f of the wall height.
const ledge = (f: number) => (2 * tap - 20 * s) * f + 12 * s;

const t = assembly('storage-tote');
const lidH = 40 * s;
const step = H + lidH - 15 * s; // stacking pitch when lidded
for (let i = 0; i < n; i++) {
  const id = i + 1;
  const z = i * (lid.value === 'closed' ? step : H - 40 * s);
  const hollow = lid.value === 'open' || i === n - 1;
  let shell = frustum(L - 2 * tap, W - 2 * tap, L - 20 * s, W - 20 * s, H - 30 * s).translate(0, 0, z)
    // Stepped rim lip and the two end hand-grips just under it.
    .union(frustum(L - 20 * s, W - 20 * s, L, W, 30 * s).translate(0, 0, z + H - 31 * s))
    // A proud stacking ledge band around the upper wall.
    .union(frustum(L - 2 * tap + ledge(0.62), W - 2 * tap + ledge(0.62), L - 2 * tap + ledge(0.7), W - 2 * tap + ledge(0.7), (H - 30 * s) * 0.08).translate(0, 0, z + (H - 30 * s) * 0.62))
    .union(blk(-L / 2 - 2, -W * 0.22, z + H - 75 * s, -L / 2 + 30 * s, W * 0.22, z + H - 25 * s))
    .union(blk(L / 2 - 30 * s, -W * 0.22, z + H - 75 * s, L / 2 + 2, W * 0.22, z + H - 25 * s));
  if (hollow) shell = shell.subtract(frustum(L - 2 * tap - 24 * s, W - 2 * tap - 24 * s, L - 34 * s, W - 34 * s, H).translate(0, 0, z + 14 * s));
  t.part(`box-${id}`, shell.color(body));
  if (lid.value === 'closed') {
    const zl = z + H - 1;
    t.part(`lid-${id}`, frustum(L + 10 * s, W + 10 * s, L - 10 * s, W - 10 * s, lidH * 0.5).translate(0, 0, zl)
      .union(frustum(L - 90 * s, W - 90 * s, L - 120 * s, W - 120 * s, lidH * 0.5).translate(0, 0, zl + lidH * 0.5 - 1))
      .color(top));
    // Flip clips: a flat strap down each short end with a thicker latch toe.
    for (const sx of [-1, 1]) {
      const x0 = sx * (L / 2 + 5 * s);
      const x1 = sx * (L / 2 + 22 * s);
      t.part(`clip-${id}-${sx < 0 ? 'l' : 'r'}`, blk(Math.min(x0, x1), -W * 0.18, z + H - 70 * s, Math.max(x0, x1), W * 0.18, zl + lidH * 0.5)
        .union(blk(Math.min(x0, sx * (L / 2 + 30 * s)), -W * 0.2, z + H - 80 * s, Math.max(x0, sx * (L / 2 + 30 * s)), W * 0.2, z + H - 55 * s))
        .color(clip));
    }
  }
}

return t.model();
