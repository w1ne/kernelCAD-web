// Original kernelCAD low-poly market stall: a plank counter on four posts
// under a sloping striped awning with a scalloped front valance, and crates
// of produce on the counter. Millimetres, Z up, base on z = 0 centred on
// x = y = 0, customer side towards -Y.

meta({
  name: 'market-stall',
  license: 'CC0-1.0',
  title: 'Market stall',
  description: 'Wooden market stall with a counter, four posts and a striped sloping awning with a scalloped valance, optionally stocked with produce crates. Knobs: width, stripe count, goods, wood, two awning colours and goods colour.',
  tags: ['market stall', 'stall', 'booth', 'stand', 'market', 'vendor', 'shop', 'awning', 'medieval'],
  kit: 'props',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'market', 'street', 'medieval', 'fantasy', 'town'],
  triangleBudget: 600,
});

const widthM = param('widthM', '2', { choices: ['1.5', '2', '2.5'], label: 'Width (m)' });
const stripes = param('stripes', '6', { choices: ['4', '6', '8'], label: 'Awning stripes' });
const goods = param('goods', 'produce', { choices: ['produce', 'none'], label: 'Goods' });
const wood = param('wood', '#a8743f', { label: 'Wood' });
const awningA = param('awningA', '#c8332b', { label: 'Awning stripe A' });
const awningB = param('awningB', '#f1ead8', { label: 'Awning stripe B' });
const produce = param('produce', '#e08a2a', { label: 'Goods' });

presets({
  blue: { awningA: '#2d5fa0', awningB: '#f1ead8' },
  green: { awningA: '#3f8a4a', awningB: '#f2dc8a', produce: '#c8302a' },
  plain: { awningA: '#c9b48a', awningB: '#b39c70' },
});

const W = Number(widthM.value) * 1000;
const D = 1000;
const counterZ = 900;
const frontH = 2200;
const backH = 2500;
const n = Number(stripes.value);

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const st = assembly('market-stall');
const pw = 80;
for (const [i, [x, y, h]] of [
  [-W / 2, -D / 2, frontH], [W / 2 - pw, -D / 2, frontH], [-W / 2, D / 2 - pw, backH], [W / 2 - pw, D / 2 - pw, backH],
].entries()) {
  st.part(`post-${i + 1}`, blk(x, y, 0, x + pw, y + pw, h).color(wood));
}
// Counter: top slab, front panel of vertical boards, and a lower shelf.
st.part('counter-top', blk(-W / 2 - 40, -D / 2 - 60, counterZ, W / 2 + 40, D / 2 - pw, counterZ + 50).color(wood));
const boards = Math.round(W / 250);
const bw = (W - 2 * pw) / boards;
for (let i = 0; i < boards; i++) {
  const x = -W / 2 + pw + i * bw;
  st.part(`front-board-${i + 1}`, blk(x + 6, -D / 2 + 10, 150, x + bw - 6, -D / 2 + 40, counterZ + 1).color(wood));
}
st.part('shelf', blk(-W / 2 + pw - 1, -D / 2 + 40, 150, W / 2 - pw + 1, D / 2 - pw, 190).color(wood));
// Roof beams along X at front and back post tops.
st.part('beam-front', blk(-W / 2, -D / 2, frontH - 100, W / 2, -D / 2 + pw, frontH).color(wood));
st.part('beam-back', blk(-W / 2, D / 2 - pw, backH - 100, W / 2, D / 2, backH).color(wood));

// Awning: sloped stripes running front to back, overhanging the front.
const over = 350;
const run = D + over;
const rise = backH - frontH;
const slope = (Math.atan2(rise, D) * 180) / Math.PI;
const len = Math.hypot(run, (rise * run) / D);
const sw = (W + 200) / n;
for (let i = 0; i < n; i++) {
  const x = -W / 2 - 100 + i * sw;
  const strip = box(sw + 1, len, 30).translate(x, 0, 0).rotateX(slope).translate(0, -D / 2 - over, frontH - (rise * over) / D);
  st.part(`stripe-${i + 1}`, strip.color(i % 2 === 0 ? awningA : awningB));
  // Valance: a pointed flap hanging from the front edge of each stripe.
  const flap = extrudePolygon([[0, 0], [sw, 0], [sw, -160], [sw / 2, -260], [0, -160]], 20)
    .rotateX(90).translate(x, -D / 2 - over + 10, frontH - (rise * over) / D + 30);
  st.part(`flap-${i + 1}`, flap.color(i % 2 === 0 ? awningA : awningB));
}

if (goods.value === 'produce') {
  // Low crates of goods sitting on the counter, tilted towards customers.
  const nc = Math.max(2, Math.round(W / 700));
  const cw = (W - 200) / nc;
  for (let i = 0; i < nc; i++) {
    const x = -W / 2 + 100 + i * cw + cw / 2;
    st.part(`crate-${i + 1}`, box(cw - 60, 420, 120, true).rotateX(-8).translate(x, -60, counterZ + 110).color(wood));
    st.part(`heap-${i + 1}`, path().moveTo(-(cw - 100) / 2, -180).lineTo((cw - 100) / 2, -180).lineTo((cw - 100) / 2, 180).lineTo(-(cw - 100) / 2, 180).close()
      .loft(path().moveTo(-cw * 0.25, -80).lineTo(cw * 0.25, -80).lineTo(cw * 0.25, 80).lineTo(-cw * 0.25, 80).close(), { spacing: 90, ruled: true })
      .rotateX(-8).translate(x, -60, counterZ + 150).color(produce));
  }
}

return st.model();
