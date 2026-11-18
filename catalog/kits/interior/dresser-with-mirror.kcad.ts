// Original kernelCAD low-poly dressing table: a vanity desk with a drawer
// on each side of a knee hole, tapered legs, a framed mirror on uprights,
// a stool and a few toiletries. Millimetres, Z up, standing on z = 0
// centred on x = y = 0. Front faces -Y; the mirror stands at the back (+Y).

meta({
  name: 'dresser-with-mirror',
  license: 'CC0-1.0',
  title: 'Dressing table',
  description: 'Vanity dressing table with drawers, tapered legs, an upright framed mirror, a padded stool and toiletries. Knobs: mirror shape, stool, wood, mirror, stool and bottle colours.',
  tags: ['dressing table', 'vanity table', 'makeup table', 'dresser', 'mirror', 'stool', 'bedroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bedroom', 'hotel'],
  triangleBudget: 500,
});

const shape = param('mirror', 'arched', { choices: ['arched', 'square', 'round'], label: 'Mirror shape' });
const stoolK = param('stool', 'yes', { choices: ['yes', 'no'], label: 'Stool' });
const wood = param('wood', '#efeee9', { label: 'Wood' });
const glass = param('glass', '#bcd3dc', { label: 'Mirror' });
const pad = param('pad', '#d9a3a0', { label: 'Stool pad' });
const bottles = param('bottles', '#c9a24a', { label: 'Toiletries' });

presets({
  walnut: { wood: '#5a3a27', pad: '#c9b89a' },
  oak: { wood: '#c69c6d', pad: '#5c7a8a', bottles: '#efeee9' },
});

const W = 1000;
const D = 450;
const H = 760;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const sq = (r: number) => path().moveTo(-r, -r).lineTo(r, -r).lineTo(r, r).lineTo(-r, r).close();

const t = assembly('dresser-with-mirror');
const yb = D / 2;
t.part('top', blk(-W / 2, -D / 2, H - 25, W / 2, D / 2, H).color(wood));
const boxH = 160;
for (const sx of [-1, 1]) {
  const s = sx < 0 ? 'left' : 'right';
  const x0 = sx < 0 ? -W / 2 + 10 : W / 2 - 320;
  t.part(`drawer-box-${s}`, blk(x0, -D / 2 + 15, H - 25 - boxH, x0 + 310, D / 2 - 10, H - 24).color(wood));
  t.part(`knob-${s}`, blk(x0 + 140, -D / 2 - 5, H - 25 - boxH / 2 - 15, x0 + 170, -D / 2 + 16, H - 25 - boxH / 2 + 15).color(bottles));
}
t.part('apron', blk(-W / 2 + 320, -D / 2 + 30, H - 85, W / 2 - 320, D / 2 - 10, H - 24).color(wood));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const x = sx * (W / 2 - 50);
  const y = sy * (D / 2 - 45);
  t.part(`leg-${sx}-${sy}`, sq(14).loft(sq(22), { spacing: H - 25 - boxH + 5, ruled: true }).translate(x, y, 0).color(wood));
}
// Mirror on two uprights at the back.
const mw = 620;
const mz0 = H + 60;
const mh = 720;
for (const sx of [-1, 1]) {
  t.part(`upright-${sx < 0 ? 'left' : 'right'}`, blk(sx * (mw / 2 + 30) - 20, yb - 60, H - 1, sx * (mw / 2 + 30) + 20, yb - 20, mz0 + mh * 0.6).color(wood));
}
let outline: [number, number][];
if (shape.value === 'round') {
  outline = [];
  for (let k = 0; k < 14; k++) {
    const a = (2 * Math.PI * k) / 14;
    outline.push([(mw / 2) * Math.cos(a), mz0 + mh / 2 + (mh / 2) * Math.sin(a)]);
  }
} else if (shape.value === 'square') {
  outline = [[-mw / 2, mz0], [mw / 2, mz0], [mw / 2, mz0 + mh], [-mw / 2, mz0 + mh]];
} else {
  outline = [[-mw / 2, mz0], [mw / 2, mz0], [mw / 2, mz0 + mh * 0.7]];
  for (let k = 1; k < 6; k++) {
    const a = (Math.PI * k) / 6;
    outline.push([(mw / 2) * Math.cos(a), mz0 + mh * 0.7 + mh * 0.3 * Math.sin(a)]);
  }
  outline.push([-mw / 2, mz0 + mh * 0.7]);
}
const inset = (pts: [number, number][], f: number) => {
  const cz = mz0 + mh / 2;
  return pts.map(([x, z]) => [x * f, cz + (z - cz) * f] as [number, number]);
};
t.part('mirror-frame', extrudePolygon(outline, 30).rotateX(90).translate(0, yb - 10, 0).color(wood));
t.part('mirror-glass', extrudePolygon(inset(outline, 0.88), 8).rotateX(90).translate(0, yb - 38, 0).color(glass));
// Toiletries on the top.
const bottle = (x: number, y: number, r: number, h: number) => ngon(r, 6).extrude(h).translate(x, y, H - 1);
t.part('bottle-1', bottle(-300, 60, 30, 160).color(bottles));
t.part('bottle-2', bottle(-220, 90, 22, 110).color(glass));
t.part('jar', bottle(300, 50, 45, 70).color(bottles));
if (stoolK.value === 'yes') {
  const sy = -D / 2 - 260;
  t.part('stool-pad', ngon(180, 10).loft(ngon(160, 10), { spacing: 70, ruled: true }).translate(0, sy, 400).color(pad));
  for (const [sx, syy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    t.part(`stool-leg-${sx}-${syy}`, sq(14).loft(sq(18), { spacing: 401, ruled: true }).translate(sx * 105, sy + syy * 105, 0).color(wood));
  }
}

return t.model();
