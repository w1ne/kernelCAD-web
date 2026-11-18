// SPDX-License-Identifier: CC0-1.0
// Assay sample divider, the bench machine in a mine laboratory that splits a
// bag of crushed drill core into identical portions so one goes to the
// assay furnace and the rest are kept. What makes one: an even, unbiased
// split. The rotary type does it with a ring of sample jars turning under
// a fixed feed: a stainless hopper drops ore onto a vibrating feeder trough
// that trickles it into whichever jar is passing, while a drive base with
// a sloped control panel turns the carousel. The riffle type (a Jones
// splitter) does it with a row of narrow chutes that tip alternately left
// and right into two pans, fed from a scoop pan tipped along the top.
// Millimetres, Z up, unit centred on the origin, control panel facing -Y.
meta({
  name: "assay-sample-divider",
  license: 'CC0-1.0',
  title: "Assay sample divider",
  description: "Laboratory sample divider for crushed ore at about real size. Rotary type: drive base with sloped control panel, display, start and stop buttons and rubber feet, turntable carrying a ring of open sample jars partly filled with ore, stainless feed hopper on a column with ore inside, vibrating feeder trough and vibrator drive. Riffle type: Jones riffle splitter with alternating chutes and fins between two side walls, two receiving pans holding the split ore and a scoop pan of feed on top. Jar count choice for the rotary type (8 or 12). Material controls: housing paint, stainless steel, sample ore and jar plastic. weathered, labWhite and highVisibility presets.",
  tags: ['mining', 'laboratory', 'assay', 'sample preparation', 'sample divider', 'riffle splitter', 'drill core'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housingPaint = param('housingPaint', '#2f6fa8', { label: 'Housing paint' });
const stainlessSteel = param('stainlessSteel', '#b9c1c4', { label: 'Stainless steel' });
const sampleOre = param('sampleOre', '#8a6a4c', { label: 'Sample ore' });
const jarPlastic = param('jarPlastic', '#e4e1d4', { label: 'Jar plastic' });
const divider = param('divider', 'rotary', { choices: ['rotary', 'riffle'], label: 'Divider type' });
const jars = param('jars', 'eight', { choices: ['eight', 'twelve'], label: 'Sample jars (rotary)' });
presets({
  weathered: { housingPaint: '#4f6577', stainlessSteel: '#979d9c', sampleOre: '#6f5a46', jarPlastic: '#c9c3ae' },
  labWhite: { housingPaint: '#e6e6e0', stainlessSteel: '#c3cacc', sampleOre: '#5d5b57', jarPlastic: '#3d6fa8' },
  highVisibility: { housingPaint: '#e48a1e', stainlessSteel: '#c5ccca', sampleOre: '#9b5a3a', jarPlastic: '#f2efe2' },
});

const p = assembly("assay-sample-divider");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Closed (x, z) outline extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};
// Open-topped tray: outer block minus inner block, wall thickness t.
const tray = (x0, y0, z0, x1, y1, z1, t) => blk(x0, y0, z0, x1, y1, z1).subtract(blk(x0 + t, y0 + t, z0 + t, x1 - t, y1 - t, z1 + 10));

const rubber = '#1f2224', screen = '#1d2f3a';

if (divider.value === 'rotary') {
  // ---- Drive base with sloped control panel ----
  for (const [k, [x, y]] of [[-260, -200], [260, -200], [-260, 200], [260, 200]].entries()) add(`foot-${k}`, rod(30, 0, 20, 8).translate(x, y, 0).color(rubber));
  // Base box with its front top edge chamfered at 45 degrees for the panel.
  add('drive-base', blk(-320, -260, 20, 320, 240, 230).subtract(blk(-330, -150, -150, 330, 150, 150).rotateX(45).translate(0, -260, 230)).color(housingPaint));
  // Panel parts are built flat (x across, y up the slope, z out) then laid on the chamfer.
  const onSlope = (s) => s.rotateX(45).translate(0, -207, 177);
  add('panel-face', onSlope(blk(-250, -55, 0, 250, 55, 3)).color('#d6d8d4'));
  add('display', onSlope(blk(-210, -5, 3, -60, 40, 6)).color(screen));
  add('start-button', onSlope(rod(18, 3, 13, 10).translate(60, -20, 0)).color('#3fae4a'));
  add('stop-button', onSlope(rod(18, 3, 13, 10).translate(120, -20, 0)).color('#d23a2a'));
  add('speed-knob', onSlope(rod(22, 3, 19, 10).translate(190, -20, 0)).color(rubber));

  // ---- Turntable and sample jars ----
  const TX = 60, TY = 30, n = jars.value === 'twelve' ? 12 : 8, RJ = n === 8 ? 150 : 175, rj = n === 8 ? 42 : 32;
  add('turntable-hub', rod(60, 230, 260, 12).translate(TX, TY, 0).color(stainlessSteel));
  add('turntable', rod(RJ + rj + 25, 260, 275, 24).translate(TX, TY, 0).color(stainlessSteel));
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, x = TX + RJ * Math.cos(a), y = TY + RJ * Math.sin(a);
    add(`jar-${i}`, lathe([[rj, 275], [rj + 3, 290], [rj + 3, 400], [rj - 4, 420]], 10).subtract(rod(rj - 4, 285, 430, 10)).translate(x, y, 0).color(jarPlastic));
    add(`jar-ore-${i}`, lathe([[rj - 4, 285], [rj - 4, 330 + (i % 3) * 15], [rj * 0.4, 345 + (i % 3) * 15]], 10).translate(x, y, 0).color(sampleOre));
  }

  // ---- Feed hopper, column and vibrating feeder ----
  const HX = -230, HY = 110;
  add('column', rod(30, 230, 700, 8).translate(HX, HY + 80, 0).color(stainlessSteel));
  add('hopper-arm', blk(HX - 25, HY - 10, 640, HX + 25, HY + 110, 680).color(stainlessSteel));
  add('hopper', lathe([[30, 560], [40, 600], [140, 720], [140, 820]], 14).subtract(lathe([[20, 555], [30, 600], [130, 725], [130, 830]], 14)).translate(HX, HY, 0).color(stainlessSteel));
  add('hopper-ore', lathe([[125, 700], [125, 760], [40, 790]], 14).translate(HX, HY, 0).color(sampleOre));
  // Trough slopes down from under the hopper to the jar ring.
  const jx = TX - RJ, jy = TY;
  const trough = tray(0, -35, -12, jx - HX + 30, 35, 22, 4).rotateY(6).rotateZ((Math.atan2(jy - HY, jx - HX) * 180) / Math.PI).translate(HX, HY, 520);
  add('feeder-trough', trough.color(stainlessSteel));
  add('feeder-ore', blk(0, -26, -8, jx - HX - 10, 26, -2).rotateY(6).rotateZ((Math.atan2(jy - HY, jx - HX) * 180) / Math.PI).translate(HX, HY, 520).color(sampleOre));
  add('vibrator', blk(HX - 70, HY - 60, 230, HX + 70, HY + 60, 490).color(housingPaint));
  add('vibrator-spring', rod(25, 490, 505, 8).translate(HX, HY, 0).color(rubber));
} else {
  // ---- Jones riffle splitter ----
  const N = 14, pitch = 34, half = (N * pitch) / 2, ZC = 300;
  for (const [k, x] of [-half - 8, half + 8].entries()) add(`side-wall-${k}`, prismY([[x - 6, 140], [x + 6, 140], [x + 6, 420], [x - 6, 420]], -170, 170).color(stainlessSteel));
  for (let i = 0; i < N; i++) {
    const x = -half + pitch * (i + 0.5);
    add(`chute-${i}`, blk(x - 15, -150, -3, x + 15, 150, 3).rotateX(i % 2 ? 40 : -40).translate(0, 0, ZC).color(stainlessSteel));
    if (i > 0) add(`fin-${i}`, blk(x - pitch / 2 - 1.5, -110, ZC - 50, x - pitch / 2 + 1.5, 110, 420).color(stainlessSteel));
  }
  for (const [k, s] of [-1, 1].entries()) {
    add(`leg-${k}`, blk(-half - 20, s * 170 - 10, 0, half + 20, s * 170 + 10, 140).color(housingPaint));
    const y0 = s < 0 ? -380 : 120, y1 = s < 0 ? -120 : 380;
    add(`receiving-pan-${k}`, tray(-half - 30, y0, 0, half + 30, y1, 110, 5).color(housingPaint));
    add(`pan-ore-${k}`, prismY([[-half + 10, 5], [half - 10, 5], [half - 50, 55], [-half + 50, 55]], y0 + 20, y1 - 20).color(sampleOre));
  }
  add('hopper-lip', blk(-half - 14, -130, 420, half + 14, 130, 440).subtract(blk(-half, -110, 410, half, 110, 450)).color(stainlessSteel));
  // Scoop pan resting tilted on the hopper lip, built level about its own centre then tipped.
  const tip = (sh) => sh.rotateX(-15).translate(0, 0, 470);
  add('scoop-pan', tip(tray(-half + 20, -100, -25, half - 20, 100, 30, 4)).color(housingPaint));
  add('scoop-ore', tip(prismY([[-half + 30, -21], [half - 30, -21], [half - 60, 10], [-half + 60, 10]], -90, 90)).color(sampleOre));
  add('scoop-handle', tip(blk(-14, 100, 0, 14, 260, 14)).color(rubber));
}

return p.model();
