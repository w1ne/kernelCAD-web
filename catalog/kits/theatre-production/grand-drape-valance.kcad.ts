// SPDX-License-Identifier: CC0-1.0
// Grand drape valance: the dressed valance that hangs across the top of the
// proscenium in front of the house curtain, in the traditional swagged style.
// What makes it a grand valance rather than a plain border: a deep velour
// panel with sewn-in box pleats, three festoon swags draped across its face
// with gold bullion fringe following each swag's lower curve, contrast-lined
// jabot cascades between and at the ends of the swags, turned tassels where
// the swags meet, a gold braid along the top, a fringe along the whole hem,
// and a painted pelmet board on its batten. The swags choice switches between
// the full swagged dress and a plain pleated valance.
// Generic visualization geometry at about real size (3.6 m wide, 1.0 m deep
// face), millimetres, Z up, valance face toward -Y, fringe tips on z = 0.

meta({
  name: "grand-drape-valance",
  license: 'CC0-1.0',
  title: "Grand drape valance",
  description: "Swagged grand-drape valance at about real size: a 3.6 m by 1 m pleated velour panel with three festoon swags edged in gold bullion fringe, contrast-lined jabot cascades, turned tassels at the swag joins, gold braid along the top, fringe along the hem and a pelmet board on a pipe batten. Swags choice: swagged or plain pleated. Material controls: velour, fringe and braid, jabot lining, pelmet and batten. houseShow, touring and operaHouse presets.",
  tags: ['grand drape', 'valance', 'house curtain', 'swag', 'fringe', 'tassel', 'proscenium', 'soft goods', 'velour', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const swags = param('swags', 'swagged', { choices: ['swagged', 'plain'], label: 'Dress' });

const velour = param('velour', '#8e1b26', { label: 'Velour' });
const fringe = param('fringe', '#d4a640', { label: 'Fringe, braid and tassels' });
const lining = param('lining', '#e2cf9a', { label: 'Jabot lining' });
const pelmet = param('pelmet', '#2b2a2e', { label: 'Pelmet board and batten' });

presets({
  houseShow: { velour: '#8e1b26', fringe: '#d4a640', lining: '#e2cf9a', pelmet: '#2b2a2e' },
  touring: { velour: '#1f3366', fringe: '#c9ced2', lining: '#9fb3d6', pelmet: '#1d1f22' },
  operaHouse: { velour: '#5c1630', fringe: '#e6c15c', lining: '#3b0f20', pelmet: '#d9cfb4' },
});

const p = assembly("grand-drape-valance");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
// (x, z) outline extruded `t` thick along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const W = 3600;
const H = 1000; // fringe tips to top braid
const FR = 110; // hem fringe drop
const ZB = H + 110; // batten centre

// Pleated backing panel: zigzag outline extruded up from the hem fringe.
const n = 60;
const X0 = -W / 2;
const step = W / n;
const zig = (dep: number, off: number) => {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([X0 + i * step, (i % 2 === 0 ? -dep : dep) + off]);
  return pts;
};
const sheet = (dep: number, a: number, b: number) => [...zig(dep, a), ...zig(dep, b).reverse()];
add("valance", extrudePolygon(sheet(22, 0, 8), H - FR - 60).translate(0, 0, FR).color(velour));
add("hem-fringe", extrudePolygon(sheet(22, -3, 11), FR).color(fringe));
add("top-braid", extrudePolygon(sheet(22, -4, 12), 60).translate(0, 0, H - 60).color(fringe));

// Pelmet board and batten above.
add("pelmet-board", blk(0, 30, H, W + 80, 220, 30).color(pelmet));
add("batten", alongX(W + 400, 24).translate(-W / 2 - 200, 60, ZB).color(pelmet));
for (const x of [-1500, 0, 1500]) add(`pelmet-hanger-${x}`, blk(x, 60, H + 30, 30, 20, ZB - H - 30).color(pelmet));

if (swags.value === 'swagged') {
  // Festoon swags: a crescent between a shallow upper curve and a deep lower one.
  const SW = W / 3;
  const crescent = (x0: number, top: number, sag: number, lowEnd: number, lowSag: number, m = 14) => {
    const pts = [];
    for (let i = 0; i <= m; i++) {
      const t = i / m;
      const b = 1 - (2 * t - 1) ** 2;
      pts.push([x0 + t * SW, lowEnd - lowSag * b]);
    }
    for (let i = m - 1; i >= 1; i--) {
      const t = i / m;
      const b = 1 - (2 * t - 1) ** 2;
      pts.push([x0 + t * SW, top - sag * b]);
    }
    return pts;
  };
  for (let s = 0; s < 3; s++) {
    const x0 = -W / 2 + s * SW;
    // Three nested folds, each a little further forward, then the fringe edge.
    for (let f = 0; f < 3; f++) {
      const shape = crescent(x0, H - 60 - f * 70, 200 + f * 60, H - 120 - f * 70, 420 - f * 30);
      add(`swag-${s}-fold-${f}`, profileXZ(shape, 30).translate(0, -50 - f * 24, 0).color(velour));
    }
    const edge = crescent(x0, H - 250, 360, H - 330, 360);
    add(`swag-${s}-fringe`, profileXZ(edge, 30).translate(0, -102, 0).color(fringe));
  }

  // Jabot cascades at the ends and between swags: a stepped, tapering panel.
  const jabot = (x: number, w: number, top: number, bottom: number) => [
    [x - w / 2, top], [x + w / 2, top], [x + w / 2, bottom + 160], [x, bottom], [x - w / 2, bottom + 240],
  ];
  for (const [k, x] of [-W / 2 + 120, -W / 6, W / 6, W / 2 - 120].entries()) {
    const top = H - 60;
    add(`jabot-${k}`, profileXZ(jabot(x, 220, top, 300), 36).translate(0, -150, 0).color(velour));
    add(`jabot-lining-${k}`, profileXZ(jabot(x + 22, 120, top - 40, 340), 10).translate(0, -172, 0).color(lining));
    // Tassel: a turned profile hanging from a short cord at the swag join.
    const tassel = path().moveTo(0, 0).lineTo(40, 0).lineTo(46, 90).lineTo(26, 130).lineTo(34, 160).lineTo(14, 190).lineTo(0, 200).close().revolve();
    add(`tassel-cord-${k}`, cylinder(120, 6, 8).translate(x, -196, 340).color(fringe));
    add(`tassel-${k}`, tassel.translate(x, -196, 150).color(fringe));
    add(`rosette-${k}`, cylinder(30, 60, 16).rotateX(90).translate(x, -170, H - 120).color(fringe));
  }
}

return p.model();
