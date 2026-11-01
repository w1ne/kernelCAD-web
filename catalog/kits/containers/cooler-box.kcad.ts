// Original kernelCAD low-poly camping cool box: a tapered insulated tub with
// a contrasting stepped lid, front latches and a fold-down carry handle, shut
// or with the lid swung open on its rear hinge.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, latches face -Y.

meta({
  name: 'cooler-box',
  license: 'CC0-1.0',
  title: 'Cooler box',
  description: 'Camping cool box with tapered tub, stepped lid, front latches and a swing carry handle, shut or open with ice inside. Knobs: size, lid, tub, lid, handle and ice colours.',
  tags: ['cooler', 'cool box', 'ice chest', 'cooler box', 'picnic', 'camping', 'beach', 'container'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camp', 'beach', 'picnic', 'garage', 'indoor'],
  triangleBudget: 320,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const lidS = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const tub = param('tub', '#c8302a', { label: 'Tub' });
const top = param('top', '#f0ece2', { label: 'Lid' });
const grip = param('grip', '#2a2a2c', { label: 'Handle and latches' });
const ice = param('ice', '#cfe6f0', { label: 'Ice' });

presets({
  blue: { tub: '#2f6fc0', top: '#f0ece2' },
  army: { tub: '#4f5a32', top: '#3b4226', grip: '#1c1c1e' },
  steel: { tub: '#b8c0c4', top: '#8a9296', grip: '#2a2a2c' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.3 : 1;
const L = 560 * s;
const W = 360 * s;
const H = 330 * s;
const lidH = 60 * s;
const rect = (l: number, w: number) => path().moveTo(-l / 2, -w / 2).lineTo(l / 2, -w / 2).lineTo(l / 2, w / 2).lineTo(-l / 2, w / 2).close();
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('cooler-box');
// Tub: tapers out from the base, hollowed from above with 40 mm insulated walls.
c.part('tub', rect(L - 40 * s, W - 40 * s).loft(rect(L, W), { spacing: H, ruled: true })
  .subtract(rect(L - 80 * s, W - 80 * s).extrude(H).translate(0, 0, 50 * s)).color(tub));

// Lid: a slab with a raised centre panel, built lying flat and swung up about the rear hinge when open.
const lid = () => blk(-L / 2 - 6 * s, -W / 2 - 6 * s, 0, L / 2 + 6 * s, W / 2 + 6 * s, lidH * 0.6)
  .union(rect(L - 40 * s, W - 40 * s).loft(rect(L - 100 * s, W - 100 * s), { spacing: lidH * 0.4, ruled: true }).translate(0, 0, lidH * 0.6 - 1));
if (lidS.value === 'closed') {
  c.part('lid', lid().translate(0, 0, H).color(top));
  // Latches: dark tabs hooked over the front lip of the lid.
  for (const x of [-0.3, 0.3]) c.part(`latch-${x < 0 ? 1 : 2}`, blk(x * L - 30 * s, -W / 2 - 14 * s, H - 50 * s, x * L + 30 * s, -W / 2 + 4 * s, H + 30 * s).color(grip));
} else {
  // Rotate about the rear top edge so the lid stands up behind the tub, leaning back 15 degrees.
  c.part('lid', lid().translate(0, -W / 2 - 6 * s, 0).rotateX(-105).translate(0, W / 2 + 6 * s, H).color(top));
  c.part('ice', rect(L - 80 * s, W - 80 * s).extrude(H - 90 * s).translate(0, 0, 50 * s).color(ice));
}

// Swing handle: posts pinned to the short ends, joined by a bar folded down over the front.
const hz = H * 0.7;
const handle = blk(-L / 2 - 26 * s, -20 * s, hz - 30 * s, -L / 2 + 10 * s, 20 * s, hz + 30 * s)
  .union(blk(L / 2 - 10 * s, -20 * s, hz - 30 * s, L / 2 + 26 * s, 20 * s, hz + 30 * s))
  .union(blk(-L / 2 - 26 * s, -W / 2 - 40 * s, hz - 50 * s, -L / 2 - 6 * s, 20 * s, hz - 20 * s))
  .union(blk(L / 2 + 6 * s, -W / 2 - 40 * s, hz - 50 * s, L / 2 + 26 * s, 20 * s, hz - 20 * s))
  .union(blk(-L / 2 - 26 * s, -W / 2 - 58 * s, hz - 50 * s, L / 2 + 26 * s, -W / 2 - 30 * s, hz - 20 * s));
c.part('handle', handle.color(grip));

return c.model();
