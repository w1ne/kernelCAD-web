// SPDX-License-Identifier: CC0-1.0
// Checkout barcode scanner: handheld pistol-grip scanner in a presentation
// stand, or an in-counter bioptic scanner.
// What makes it a barcode scanner rather than a block: the handheld has a
// flared head with a glass reading window in a rubber nose bumper, a raked
// pistol grip with a trigger and rubber overmould, sits butt-down in a cradle
// on a weighted base and trails a coiled cable; the bioptic has a flat glass
// platter in a scale-plate frame and a raked tower window behind it.
// Generic visualization geometry at real size (handheld on stand about 170 mm
// across the base, 340 mm tall; bioptic 400 x 330 mm, 350 mm tall), millimetres,
// Z up, reading window towards -Y, counter top on z = 0.
meta({
  name: 'barcode-scanner',
  license: 'CC0-1.0',
  title: 'Barcode scanner',
  description: 'Checkout barcode scanner: pistol-grip handheld with flared head, glass window in a rubber nose bumper, trigger and grip overmould, standing in a weighted presentation stand with coiled cable; or an in-counter bioptic scanner with glass platter and raked tower window. Material controls: ABS housing, scan window glass, trigger and status light, rubber. Clean-store and night-restock presets.',
  tags: ['barcode scanner', 'handheld scanner', 'bioptic scanner', 'POS scanner', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop', 'CC0'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const style = param('style', 'handheld', { choices: ['handheld', 'bioptic'], label: 'Scanner type' });
const abs = param('abs', '#38474e', { label: 'Housing (ABS plastic)' });
const glass = param('glass', '#5fb8c9', { label: 'Scan window glass' });
const polycarbonate = param('polycarbonate', '#e0a735', { label: 'Trigger and status light (polycarbonate)' });
const rubber = param('rubber', '#1f2427', { label: 'Nose bumper, grip and cable (rubber)' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    polycarbonate: '#3aa267',
    rubber: '#59646a',
  },
  nightRestock: {
    abs: '#364a55',
    glass: '#3e6677',
    polycarbonate: '#d84b3a',
    rubber: '#1a1d1f',
  },
});

const p = assembly('barcode-scanner');
const add = (name, shape) => p.part(name, shape.scale(scale));

const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 6) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Extrude a (y, z) side profile across X, centred on x = 0.
const side = (pts, width) => extrudePolygon(pts, width).rotateX(90).rotateZ(90).translate(-width / 2, 0, 0);

if (style.value === 'handheld') {
  // Presentation stand: weighted base, raked neck and a cup that holds the grip butt.
  add('stand-base', turned([[0, 0], [85, 0], [85, 10], [70, 22], [0, 22]]).color(abs));
  add('stand-foot-ring', turned([[60, -2], [82, -2], [82, 2], [60, 2]]).translate(0, 0, 2).color(rubber));
  add('stand-neck', rod([0, 30, 20], [0, 8, 92], 14, 10).color(abs));
  add('stand-cup', turned([[28, 0], [42, 0], [46, 44], [34, 44], [30, 8], [0, 8], [0, 0]]).translate(0, 4, 88).color(abs));

  // The scanner, profile in local (y, z) with the grip butt at the origin.
  const G = [0, -28, 104];
  const at = (shape) => shape.translate(G[0], G[1], G[2]);
  const body = [[-100, 150], [-100, 225], [-80, 232], [60, 212], [80, 200], [82, 170], [62, 152], [56, 14], [50, 0], [14, 0], [8, 12], [-20, 140], [-55, 145]];
  add('scanner-body', at(side(body, 72)).color(abs));
  add('grip-overmould', at(side([[3, 30], [57, 30], [60, 120], [-16, 120]], 78)).color(rubber));
  add('trigger', at(side([[-18, 142], [-50, 145], [-46, 116], [-20, 108]], 24)).color(polycarbonate));
  add('nose-bumper', at(side([[-108, 144], [-96, 144], [-96, 234], [-108, 234]], 84)).color(rubber));
  add('scan-window', at(side([[-111, 156], [-107, 156], [-107, 222], [-111, 222]], 62)).color(glass));
  add('status-light', at(side([[30, 214], [50, 211], [50, 220], [30, 223]], 22)).color(polycarbonate));

  // Coiled cable from the cup down behind the stand to the counter.
  const C = [0, 100];
  const turns = 5;
  const seg = 8;
  let prev = [0, 34, 98];
  for (let i = 0; i <= turns * seg; i += 1) {
    const a = (2 * Math.PI * i) / seg;
    const z = 100 - (75 * i) / (turns * seg);
    const next = [C[0] + 18 * Math.cos(a), C[1] - 18 * Math.sin(a), z];
    add(`cable-${i}`, rod(prev, next, 4, 4).color(rubber));
    prev = next;
  }
  add('cable-tail', rod(prev, [0, 300, 6], 4, 4).color(rubber));
} else {
  // Bioptic: low platter body set into the counter, a narrower raked tower
  // at the back, and the crossed laser lines seen through both windows.
  add('platter-body', side([[-200, 0], [165, 0], [165, 95], [-195, 95], [-200, 85]], 400).color(abs));
  add('platter-gasket', box(404, 369, 8, true).translate(0, -17, 4).color(rubber));
  add('scale-plate', box(390, 300, 6, true).translate(0, -40, 98).color(abs));
  add('produce-lip', box(390, 12, 18, true).translate(0, -193, 104).color(rubber));
  add('platter-window', box(240, 170, 4, true).translate(0, -45, 102).color(glass));
  for (const [i, a] of [[0, 0], [1, 60], [2, -60]]) {
    add(`platter-scan-line-${i}`, box(150, 3, 2, true).rotateZ(a).translate(0, -45, 105).color(polycarbonate));
  }
  add('tower', side([[85, 95], [165, 95], [165, 340], [140, 352], [110, 345]], 300).color(abs));
  add('tower-window', side([[82, 130], [88, 130], [107, 320], [101, 320]], 220).color(glass));
  for (const [i, a] of [[0, 30], [1, -30]]) {
    const line = box(150, 2, 3, true).rotateY(a).rotateX(-6).translate(0, 89, 225);
    add(`tower-scan-line-${i}`, line.color(polycarbonate));
  }
  add('status-bar', side([[118, 346], [150, 352], [150, 360], [118, 354]], 140).color(polycarbonate));
  add('customer-display', side([[150, 360], [170, 360], [185, 420], [165, 420]], 120).color(abs));
  add('customer-screen', side([[147, 368], [151, 368], [164, 414], [160, 414]], 100).color(glass));
}

return p.model();
