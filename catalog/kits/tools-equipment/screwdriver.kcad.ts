// Original kernelCAD low-poly screwdriver lying flat as a pickup item: a
// faceted two-tone handle with a bulged grip, a steel ferrule and shaft and a
// flat-blade or cross-head tip. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, tip pointing +X.

meta({
  name: 'screwdriver',
  license: 'CC0-1.0',
  title: 'Screwdriver',
  description: 'Screwdriver lying flat as a pickup or workshop prop, with a faceted two-tone handle, steel shaft and flat-blade or Phillips cross tip. Knobs: tip, size, handle, grip and shaft colours.',
  tags: ['screwdriver', 'phillips', 'flathead', 'tool', 'hand tool', 'diy', 'workshop', 'item', 'pickup'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 400,
});

const tip = param('tip', 'flat', { choices: ['flat', 'phillips'], label: 'Tip' });
const size = param('size', 'medium', { choices: ['stubby', 'medium', 'long'], label: 'Size' });
const handle = param('handle', '#d23a2a', { label: 'Handle' });
const grip = param('grip', '#232325', { label: 'Grip bands' });
const shaft = param('shaft', '#c4c9cf', { label: 'Shaft' });

presets({
  yellow: { handle: '#e8b21c' },
  wooden: { handle: '#b07a42', grip: '#7a5030' },
});

const HL = size.value === 'stubby' ? 70 : 105; // handle length
const SL = size.value === 'stubby' ? 35 : size.value === 'long' ? 250 : 140; // exposed shaft length
const R = size.value === 'stubby' ? 16 : 15; // handle radius
// Regular n-gon with flat faces on the axes (so it lies on a flat).
const ngon = (r: number, n = 8) => {
  const a0 = Math.PI / n;
  let p = path().moveTo(r * Math.cos(a0), r * Math.sin(a0));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(a0 + (2 * Math.PI * k) / n), r * Math.sin(a0 + (2 * Math.PI * k) / n));
  return p.close();
};
const zc = 1.03 * R * Math.cos(Math.PI / 8); // the proud grip band rests on the floor
const total = HL + SL + 12;
const x0 = -total / 2; // butt of the handle
const along = (prof: ReturnType<typeof ngon>, rest: ReturnType<typeof ngon>[], zs: number[]) =>
  prof.loft(rest, { planes: zs.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })), ruled: true })
    .rotateY(90).translate(x0, 0, zc);

const sd = assembly('screwdriver');
// Handle: bulged octagonal body narrowing to a neck at the ferrule.
sd.part('handle', along(ngon(R * 0.94), [ngon(R), ngon(R), ngon(R * 0.7)], [HL * 0.12, HL * 0.2, HL * 0.72, HL]).color(handle));
// Grip: end cap and a band toward the front, a little proud of the handle.
sd.part('grip', along(ngon(R * 0.8), [ngon(R * 0.95)], [0, HL * 0.14]).color(grip));
sd.part('grip-band', along(ngon(R * 1.03), [ngon(R * 1.03)], [HL * 0.5, HL * 0.62]).color(grip));
// Shaft from inside the handle, with the tip formed at its end.
const sr = R * 0.24;
let s = along(ngon(sr, 6), [ngon(sr, 6)], [HL - 6, HL + SL]);
if (tip.value === 'flat') {
  const fl = (w: number, t: number) => path().moveTo(-t, -w).lineTo(t, -w).lineTo(t, w).lineTo(-t, w).close();
  s = s.union(fl(sr * 0.9, sr * 0.9).loft(fl(sr * 1.5, sr * 0.25), {
    planes: [{ plane: 'XY', origin: [0, 0, HL + SL - 2] }, { plane: 'XY', origin: [0, 0, HL + SL + 12] }],
    ruled: true,
  }).rotateY(90).translate(x0, 0, zc));
} else {
  // Cross-head: a four-pointed star tapering to a point.
  const star = (r: number) => {
    let p = path().moveTo(r, 0);
    for (let k = 1; k < 8; k++) {
      const rr = k % 2 === 0 ? r : r * 0.35;
      p = p.lineTo(rr * Math.cos((Math.PI * k) / 4), rr * Math.sin((Math.PI * k) / 4));
    }
    return p.close();
  };
  s = s.union(star(sr * 1.1).loft(star(sr * 0.3), {
    planes: [{ plane: 'XY', origin: [0, 0, HL + SL - 2] }, { plane: 'XY', origin: [0, 0, HL + SL + 12] }],
    ruled: true,
  }).rotateY(90).translate(x0, 0, zc));
}
sd.part('shaft', s.color(shaft));

return sd.model();
