// SPDX-License-Identifier: CC0-1.0
// UV treatment chamber: the ultraviolet steriliser that kills pathogens such
// as Pythium in recirculated nutrient solution before it goes back to the
// crop, shown on a small steel stand with its ballast.
// What makes it a UV steriliser: a long polished stainless chamber lying on
// clamp saddles, inlet and outlet ports rising from the top near each end, a
// lamp gland and connector cap on the service end (with room to pull the
// lamp and quartz sleeve out), a glowing sight port, and a separate ballast
// box with lamp-status lights and an hour meter wired to the lamp cap.
// Generic visualization geometry at about real size (chamber about 120 mm
// across, 900 mm long), millimetres, Z up, front toward -Y.

meta({
  name: "uv-treatment-chamber",
  license: 'CC0-1.0',
  title: "UV treatment chamber",
  description: "UV steriliser for recirculated nutrient solution at about real size: polished stainless chamber on clamp saddles with domed blind end, lamp gland and connector cap on the service end, glowing UV sight port, top inlet and outlet ports with unions and PVC risers, drain plug, and a ballast box with lamp-status lights and an hour meter cabled to the lamp; single or twin chambers. Material controls: chamber, stand, PVC pipework and ballast housing. stainless, whitePoly, blueTrim and weathered presets.",
  tags: ['uv steriliser', 'uv sterilizer', 'ultraviolet', 'disinfection', 'pathogen control', 'water treatment', 'recirculation', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const chamber = param('chamber', '#c3c8cc', { label: 'Chamber (stainless steel)' });
const stand = param('stand', '#3d4347', { label: 'Stand and saddles (steel)' });
const pipe = param('pipe', '#dcdcd4', { label: 'Pipework (PVC)' });
const ballast = param('ballast', '#e6e6e0', { label: 'Ballast housing (polymer)' });
const count = param('chambers', 'single', { choices: ['single', 'twin'], label: 'Chambers' });

presets({
  stainless: { chamber: '#c3c8cc', stand: '#3d4347', pipe: '#dcdcd4', ballast: '#e6e6e0' },
  whitePoly: { chamber: '#eef0ec', stand: '#5a6066', pipe: '#8e9497', ballast: '#2f6fa8' },
  blueTrim: { chamber: '#b9c0c4', stand: '#2f5f8f', pipe: '#e6e6e0', ballast: '#2a2d30' },
  weathered: { chamber: '#9ea2a0', stand: '#5c5a52', pipe: '#bdb9aa', ballast: '#b9b5a4' },
});

const p = assembly("uv-treatment-chamber");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 18) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// cylinder(...).rotateX(90) runs from its origin toward -Y.
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateX(90).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};
// Revolved profile around X: [r, x] points.
const turnedX = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, x] of pts.slice(1)) pb = pb.lineTo(r, x);
  return pb.close().revolve(360, seg).rotateY(90);
};

const R = 60; // chamber radius
const L = 900; // shell length
const X0 = -L / 2;
const ZC = 420; // chamber axis height
const twin = count.value === 'twin';
const ys = twin ? [-110, 110] : [0];
const SW = twin ? 420 : 240; // stand depth

// Stand: two H-frames with a foot rail, cross tie and saddles.
for (const [i, x] of [X0 + 170, X0 + L - 200].entries()) {
  for (const y of [-SW / 2, SW / 2]) add(`leg-${i}-${y > 0 ? 'b' : 'f'}`, blk(x, y, 0, 40, 40, ZC - R - 20).color(stand));
  add(`foot-${i}`, blk(x, 0, 0, 80, SW + 80, 20).color(stand));
  add(`saddle-beam-${i}`, blk(x, 0, ZC - R - 40, 60, SW + 40, 30).color(stand));
}
add("tie-rail", blk(-15, 0, 140, L - 330, 30, 30).color(stand));

ys.forEach((y, i) => {
  const c = `chamber-${i}`;
  // Shell: domed blind end at -X, flanged service end at +X.
  add(`${c}-shell`, turnedX([
    [0, X0 - 40], [30, X0 - 34], [50, X0 - 20], [R, X0], [R, X0 + L], [R + 12, X0 + L], [R + 12, X0 + L + 20], [0, X0 + L + 20],
  ]).translate(0, y, ZC).color(chamber));
  // Clamp bands over the saddles.
  for (const [k, x] of [X0 + 170, X0 + L - 200].entries()) {
    add(`${c}-clamp-${k}`, cylX(x - 20, y, ZC, 40, R + 6, 18).color(stand));
    add(`${c}-clamp-bolt-${k}`, blk(x, y, ZC + R + 2, 20, 30, 16).color('#9aa0a4'));
  }
  // Lamp gland nut, connector cap and boot on the service end.
  add(`${c}-gland-nut`, cylX(X0 + L + 20, y, ZC, 40, 38, 6).color('#9aa0a4'));
  add(`${c}-lamp-cap`, cylX(X0 + L + 60, y, ZC, 70, 30, 14).color(ballast));
  add(`${c}-cap-boot`, cylX(X0 + L + 130, y, ZC, 40, 14, 10).color('#2a2d30'));
  // Glowing UV sight port near the service end.
  add(`${c}-sight-port`, cylY(X0 + L - 80, y - R + 8, ZC + 10, 16, 18, 12).color('#9a8cff'));
  add(`${c}-sight-ring`, cylY(X0 + L - 80, y - R + 4, ZC + 10, 6, 24, 12).color('#9aa0a4'));
  // Top inlet near the blind end, outlet near the service end; unions and risers.
  for (const [tag, x] of [['in', X0 + 90], ['out', X0 + L - 160]] as const) {
    add(`${c}-${tag}-port`, cylZ(x, y, ZC + R - 10, 60, 24, 12).color(chamber));
    add(`${c}-${tag}-union`, cylZ(x, y, ZC + R + 50, 36, 34, 8).color(pipe));
    add(`${c}-${tag}-riser`, cylZ(x, y, ZC + R + 86, 150, 24, 12).color(pipe));
    add(`${c}-${tag}-elbow`, cylZ(x, y, ZC + R + 230, 50, 30, 12).color(pipe));
  }
  add(`${c}-drain-plug`, cylZ(X0 + 60, y, ZC - R - 18, 22, 14, 6).color('#9aa0a4'));
  add(`${c}-rating-plate`, blk(-60, y - R - 1, ZC - 16, 140, 3, 32).color('#2a2d30'));
});

// Header pipes joining the risers: inlet from the left, outlet to the right.
const ZH = ZC + R + 255;
const yh = twin ? ys[0] : 0;
const span = twin ? 220 : 0;
add("inlet-header", cylX(X0 - 260, yh, ZH, 350, 24).color(pipe));
add("outlet-header", cylX(X0 + L - 160, yh, ZH, 350, 24).color(pipe));
if (twin) {
  add("inlet-crossover", cylY(X0 + 90, ys[1], ZH, span, 24).color(pipe));
  add("outlet-crossover", cylY(X0 + L - 160, ys[1], ZH, span, 24).color(pipe));
}
add("inlet-flow-arrow", blk(X0 - 150, yh - 26, ZH - 8, 120, 3, 16).color('#c0392b'));
add("outlet-flow-arrow", blk(X0 + L + 30, yh - 26, ZH - 8, 120, 3, 16).color('#2a8a4a'));

// Ballast box on a post in front of the stand, cabled to each lamp cap.
const BX = X0 + L - 60;
const BY = -SW / 2 - 200;
add("ballast-post", blk(BX, BY, 0, 50, 50, 520).color(stand));
add("ballast-post-foot", blk(BX, BY, 0, 200, 200, 14).color(stand));
add("ballast-box", blk(BX, BY - 50, 470, 240, 90, 320).color(ballast));
add("ballast-lid-seam", blk(BX, BY - 96, 740, 230, 4, 4).color('#9aa0a4'));
add("hour-meter", blk(BX, BY - 97, 680, 110, 4, 36).color('#14281d'));
add("hour-meter-digits", blk(BX, BY - 100, 690, 80, 3, 16).color('#e0a21c'));
ys.forEach((y, i) => {
  add(`lamp-led-${i}`, cylY(BX - 60 + i * 40, BY - 95, 620, 6, 9, 8).color('#6fe08a'));
  const cx = X0 + L + 170;
  add(`lamp-cable-${i}-a`, rod([X0 + L + 150, y, ZC], [cx + 40, y - 40, ZC - 120], 7).color('#2a2d30'));
  add(`lamp-cable-${i}-b`, rod([cx + 40, y - 40, ZC - 120], [BX + 60, BY - 50, 480], 7).color('#2a2d30'));
});
add("fault-led", cylY(BX + 60, BY - 95, 620, 6, 9, 8).color('#c0392b'));
add("warning-label", blk(BX, BY - 97, 520, 150, 3, 60).color('#e0a21c'));
add("mains-gland", cylZ(BX - 80, BY - 50, 450, 20, 12, 8).color('#2a2d30'));
add("mains-cable", rod([BX - 80, BY - 50, 452], [BX - 200, BY - 120, 10], 6).color('#2a2d30'));

return p.model();
