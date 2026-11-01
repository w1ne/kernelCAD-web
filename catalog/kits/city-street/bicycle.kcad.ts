// Original kernelCAD low-poly bicycle: two faceted tyre rings with crossed
// spokes, a diamond frame of square tubes, fork, saddle, handlebar and crank.
// Millimetres, Z up, wheels on z = 0, riding direction +X.

meta({
  name: 'bicycle',
  license: 'CC0-1.0',
  title: 'Bicycle',
  description: 'City bicycle with a diamond frame, faceted wheels, saddle, handlebar and optional rear rack, standing upright. Knobs: rack, frame, tyre and saddle colours.',
  tags: ['bicycle', 'bike', 'cycle', 'vehicle', 'transport', 'commute', 'street'],
  kit: 'city-street',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'street', 'park'],
  triangleBudget: 600,
});

const rack = param('rack', 'yes', { choices: ['yes', 'no'], label: 'Rear rack' });
const frame = param('frame', '#2a7fc8', { label: 'Frame' });
const tyre = param('tyre', '#1b1c1d', { label: 'Tyres and spokes' });
const saddle = param('saddle', '#5a3a27', { label: 'Saddle and grips' });

presets({
  red: { frame: '#c8261e' },
  mint: { frame: '#8fd1b8', saddle: '#c8a46a' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const R = 340;
const rearX = -520;
const frontX = 530;
const bb: [number, number] = [-40, 300];
const seat: [number, number] = [-200, 820];
const headTop: [number, number] = [400, 820];
const headLow: [number, number] = [430, 700];
const bk = assembly('bicycle');

for (const [tag, x] of [['rear', rearX], ['front', frontX]] as const) {
  const ring = ngon(R, 12).extrude(34).subtract(ngon(R - 45, 12).extrude(60).translate(0, 0, -10)).translate(0, 0, -17).rotateX(90).translate(x, 0, R);
  bk.part(`tyre-${tag}`, ring.color(tyre));
  bk.part(`spoke-${tag}-1`, bar(x - R + 40, R, x + R - 40, R, 12).color(tyre));
  bk.part(`spoke-${tag}-2`, bar(x, 40, x, 2 * R - 40, 12).color(tyre));
  bk.part(`hub-${tag}`, ngon(40, 6).extrude(80).translate(0, 0, -40).rotateX(90).translate(x, 0, R).color(frame));
}
const t = 34;
bk.part('seat-tube', bar(bb[0], bb[1], seat[0], seat[1], t).color(frame));
bk.part('top-tube', bar(seat[0] + 20, seat[1] - 40, headTop[0], headTop[1] - 20, t).color(frame));
bk.part('down-tube', bar(bb[0], bb[1], headLow[0], headLow[1], t + 6).color(frame));
bk.part('chain-stay', bar(bb[0], bb[1], rearX, R, 26).color(frame));
bk.part('seat-stay', bar(seat[0] + 10, seat[1] - 60, rearX, R, 24).color(frame));
bk.part('head-tube', bar(headLow[0], headLow[1], headTop[0], headTop[1] + 20, 44).color(frame));
bk.part('fork', bar(headLow[0], headLow[1], frontX, R, 30).color(frame));
bk.part('stem', bar(headTop[0], headTop[1], 370, 980, 30).color(frame));
bk.part('handlebar', box(60, 560, 30, true).translate(360, 0, 990).color(frame));
for (const side of [-1, 1]) {
  bk.part(`grip-${side < 0 ? 'l' : 'r'}`, box(50, 110, 40, true).translate(355, side * 250, 990).color(saddle));
}
bk.part('seat-post', bar(seat[0], seat[1], seat[0] - 25, 900, 26).color(frame));
bk.part('saddle', extrudePolygon([[-140, -80], [60, -40], [130, -20], [130, 20], [60, 40], [-140, 80]], 50).translate(seat[0] - 30, 0, 900).color(saddle));
bk.part('crank', bar(bb[0] - 120, bb[1] - 100, bb[0] + 120, bb[1] + 100, 26, 0).color(tyre));
bk.part('chainring', ngon(90, 8).extrude(16).translate(0, 0, -8).rotateX(90).translate(bb[0], 40, bb[1]).color(tyre));
for (const [k, side] of [[1, -1], [2, 1]] as const) {
  bk.part(`pedal-${k}`, box(100, 90, 24, true).translate(bb[0] + side * 120, side * 70, bb[1] + side * 100).color(tyre));
}
if (rack.value === 'yes') {
  bk.part('rack', box(380, 140, 20, true).translate(rearX + 40, 0, 2 * R + 60).color(frame));
  bk.part('rack-strut', bar(rearX, R, rearX + 30, 2 * R + 55, 20).color(frame));
  bk.part('rack-stay', bar(seat[0] - 10, seat[1] - 120, rearX + 200, 2 * R + 55, 18).color(frame));
}

return bk.model();
