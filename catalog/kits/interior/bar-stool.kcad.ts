// Original kernelCAD low-poly bar stool: a faceted padded seat on four splayed
// legs with a footrest ring, or on a pedestal column with a ring footrest.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'bar-stool',
  license: 'CC0-1.0',
  title: 'Bar stool',
  description: 'Bar or counter stool with a round padded seat on four splayed legs or a pedestal column, with a footrest and optional low back. Knobs: seat height, base style, back, seat and frame colours.',
  tags: ['bar stool', 'stool', 'counter stool', 'kitchen stool', 'seat', 'bar', 'pub'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room', 'bar', 'cafe'],
  triangleBudget: 400,
});

const height = param('height', 'bar', { choices: ['counter', 'bar'], label: 'Seat height' });
const style = param('style', 'legs', { choices: ['legs', 'pedestal'], label: 'Base style' });
const back = param('back', 'none', { choices: ['none', 'low'], label: 'Back' });
const seat = param('seat', '#3b3d42', { label: 'Seat' });
const frame = param('frame', '#a07548', { label: 'Frame' });

presets({
  industrial: { seat: '#7a4a2e', frame: '#2a2c2e' },
  chrome: { seat: '#c23b30', frame: '#c9ccd0' },
  natural: { seat: '#d9cfbd', frame: '#c69c6d' },
});

const seatZ = height.value === 'bar' ? 760 : 650;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Ruled loft between two rings at arbitrary points: a slanted leg or tube.
const strut = (r: number, s: number, a: [number, number, number], b: [number, number, number]) =>
  ngon(r, s, Math.PI / s).loft(ngon(r, s, Math.PI / s), {
    planes: [{ plane: 'XY', origin: a }, { plane: 'XY', origin: b }],
    ruled: true,
  });
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const st = assembly('bar-stool');
const seatT = 60;
// Padded seat: a faceted cushion that rounds over at the top edge.
st.part('seat', ngon(185, 10).loft([ngon(200, 10), ngon(170, 10)], {
  planes: [
    { plane: 'XY', origin: [0, 0, seatZ - seatT] },
    { plane: 'XY', origin: [0, 0, seatZ - 20] },
    { plane: 'XY', origin: [0, 0, seatZ] },
  ],
  ruled: true,
}).color(seat));

const footZ = seatZ * 0.38;
if (style.value === 'legs') {
  const top = 120;
  const foot = 190;
  const legs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  legs.forEach(([sx, sy], i) => {
    st.part(`leg-${i + 1}`, strut(18, 4, [sx * foot, sy * foot, 0], [sx * top, sy * top, seatZ - seatT + 5]).color(frame));
  });
  // Footrest: four rails joining the legs at footrest height.
  const f = foot + (top - foot) * (footZ / (seatZ - seatT));
  st.part('rail-front', blk(-f, -f - 14, footZ - 12, f, -f + 14, footZ + 12).color(frame));
  st.part('rail-back', blk(-f, f - 14, footZ - 12, f, f + 14, footZ + 12).color(frame));
  st.part('rail-left', blk(-f - 14, -f, footZ - 12, -f + 14, f, footZ + 12).color(frame));
  st.part('rail-right', blk(f - 14, -f, footZ - 12, f + 14, f, footZ + 12).color(frame));
  st.part('apron', blk(-top - 10, -top - 10, seatZ - seatT - 40, top + 10, top + 10, seatZ - seatT + 2).color(frame));
} else {
  st.part('foot', ngon(210, 8).loft(ngon(150, 8), { spacing: 30, ruled: true }).color(frame));
  st.part('column', ngon(32, 8).extrude(seatZ - seatT - 20).translate(0, 0, 20).color(frame));
  st.part('cup', ngon(70, 8).loft(ngon(110, 8), { spacing: 40, ruled: true }).translate(0, 0, seatZ - seatT - 38).color(frame));
  const ring = ngon(190, 10).extrude(20).subtract(ngon(165, 10).extrude(40).translate(0, 0, -10));
  st.part('footrest', ring.translate(0, 0, footZ)
    .union(blk(-180, -10, footZ + 2, 180, 10, footZ + 18))
    .union(blk(-10, -180, footZ + 2, 10, 180, footZ + 18)).color(frame));
}

if (back.value === 'low') {
  for (const sx of [-1, 1]) {
    st.part(`back-post-${sx < 0 ? 'left' : 'right'}`, strut(14, 4, [sx * 110, 160, seatZ - 30], [sx * 120, 212, seatZ + 250]).color(frame));
  }
  st.part('back-rest', box(320, 30, 110, true).rotateX(-10).translate(0, 190, seatZ + 220).color(seat));
}

return st.model();
