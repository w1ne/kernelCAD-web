// SPDX-License-Identifier: CC0-1.0
// Stage extension wing: a tapered side-stage extension bolted to the end of
// a platform stage, the add-on deck that widens a stage for a band or a
// thrust entrance.
// What makes it an extension wing rather than a table: a tapered deck with
// an angled front edge and a hi-vis nosing, a steel perimeter frame, four
// adjustable legs on screw jacks with base plates and diagonal braces, a
// guard rail on posts round the open outer end, and tie-in clamp plates
// bridging onto the stub of the main stage it extends.
// Generic visualization geometry at about real size (1.5 m long, tapering
// from 1.2 m to 0.8 m deep, 600 mm deck height), millimetres, Z up, front
// toward -Y, main stage on +X, base plates on z = 0.

meta({
  name: "stage-extension-wing",
  license: 'CC0-1.0',
  title: "Stage extension wing",
  description: "Tapered side-stage extension at about real size: a 1.5 m deck tapering from 1.2 m to 0.8 m deep with an angled hi-vis front nosing, a steel perimeter frame, four adjustable legs on screw jacks with base plates and diagonal braces, a guard rail on posts round the open outer end, and tie-in clamp plates bridging onto a stub of the main stage. Material controls: deck top, steel frame, screw jacks and clamps, nosing. houseShow, touring and outdoor presets; with or without guard rail.",
  tags: ['stage extension', 'stage wing', 'thrust stage', 'staging', 'stage deck', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rail = param('rail', 'guarded', { choices: ['guarded', 'open'], label: 'Outer guard rail' });

const deck = param('deck', '#2a2b2e', { label: 'Deck top' });
const frame = param('frame', '#5a646c', { label: 'Steel frame and legs' });
const jacks = param('jacks', '#d9a321', { label: 'Screw jacks and clamps' });
const nosing = param('nosing', '#f2f2ee', { label: 'Edge nosing' });

presets({
  houseShow: { deck: '#2a2b2e', frame: '#5a646c', jacks: '#d9a321', nosing: '#f2f2ee' },
  touring: { deck: '#7a5a3a', frame: '#c3cacd', jacks: '#2e3236', nosing: '#e6b31e' },
  outdoor: { deck: '#3b3f2e', frame: '#8f9aa1', jacks: '#c2452f', nosing: '#f2c418' },
});

const STAGE = '#1c1d1f';

const p = assembly("stage-extension-wing");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const deg = (r: number) => (r * 180) / Math.PI;

const X0 = -750; // open outer end
const X1 = 750; // joins the main stage
const YB = 500; // straight back edge
const YF0 = -300; // front edge at the outer end
const YF1 = -700; // front edge at the main stage
const ZS = 600; // deck top
const yFront = (x: number) => YF0 + ((x - X0) / (X1 - X0)) * (YF1 - YF0);

// Deck top and the steel frame underneath, same tapered outline.
const outline = (inset: number) => [[X0 + inset, yFront(X0 + inset) + inset], [X1 - inset, yFront(X1 - inset) + inset], [X1 - inset, YB - inset], [X0 + inset, YB - inset]];
add("deck", extrudePolygon(outline(0), 30).translate(0, 0, ZS - 30).color(deck));
add("frame", extrudePolygon(outline(0), 90).subtract(extrudePolygon(outline(50), 100).translate(0, 0, -5)).translate(0, 0, ZS - 120).color(frame));
add("frame-cross", blk(0, (YB + yFront(0)) / 2, ZS - 110, 40, YB - yFront(0) - 60, 80).color(frame));

// Hi-vis nosing along the angled front and the outer end.
const fa = Math.atan2(YF1 - YF0, X1 - X0);
const flen = Math.hypot(X1 - X0, YF1 - YF0);
add("nosing-front", box(flen, 40, 8, true).rotateZ(deg(fa)).translate(0, (YF0 + YF1) / 2 + 20, ZS + 4).color(nosing));
add("nosing-end", blk(X0 + 20, (YF0 + YB) / 2, ZS, 40, YB - YF0, 8).color(nosing));

// Four legs on screw jacks with base plates, braced in pairs.
const legs: [string, number, number][] = [["of", X0 + 90, yFront(X0 + 90) + 90], ["ob", X0 + 90, YB - 90], ["if", X1 - 90, yFront(X1 - 90) + 90], ["ib", X1 - 90, YB - 90]];
for (const [s, x, y] of legs) {
  add(`base-${s}`, blk(x, y, 0, 140, 140, 8).color(jacks));
  add(`jack-${s}`, cylinder(150, 14, 12).translate(x, y, 8).color(jacks));
  add(`jack-nut-${s}`, cylinder(26, 30, 6).translate(x, y, 110).color(jacks));
  add(`jack-handle-${s}`, cylinder(120, 7, 8).rotateY(90).translate(x - 60, y, 123).color(jacks));
  add(`leg-${s}`, blk(x, y, 136, 60, 60, ZS - 120 - 136).color(frame));
}
// Diagonal braces across each pair of legs on the outer and inner ends.
for (const [s, x, ya, yb] of [["o", X0 + 90, yFront(X0 + 90) + 90, YB - 90], ["i", X1 - 90, yFront(X1 - 90) + 90, YB - 90]] as [string, number, number, number][]) {
  const span = yb - ya - 60;
  const rise = ZS - 120 - 220;
  add(`brace-${s}`, cylinder(Math.hypot(span, rise), 14, 10).rotateX(-deg(Math.atan2(span, rise))).translate(x, ya + 30, 200).color(frame));
  add(`brace-${s}-low`, cylinder(span, 14, 10).rotateX(-90).translate(x, ya + 30, 200).color(frame));
}

// Stub of the main stage this wing bolts onto, with tie-in clamp plates
// bridging the joint.
add("main-stage", blk(X1 + 200, -100, 0, 400, 1400, ZS).color(STAGE));
add("main-stage-top", blk(X1 + 200, -100, ZS - 2, 400, 1400, 4).color(deck));
for (const [i, y] of [-500, -100, 300].entries()) {
  add(`clamp-${i}`, blk(X1, y, ZS + 2, 160, 70, 6).color(jacks));
  for (const dx of [-50, 50]) add(`clamp-${i}-bolt-${dx < 0 ? 'a' : 'b'}`, cylinder(8, 14, 6).translate(X1 + dx, y, ZS + 8).color(frame));
}

// Guard rail on posts round the open outer end.
if (rail.value === 'guarded') {
  const RX = X0 + 40;
  const ys = [yFront(RX) + 60, (yFront(RX) + YB) / 2, YB - 60];
  for (const [i, y] of ys.entries()) {
    add(`rail-post-${i}`, cylinder(1000, 22, 12).translate(RX, y, ZS).color(frame));
    add(`rail-socket-${i}`, blk(RX, y, ZS - 100, 70, 70, 100).color(jacks));
  }
  const len = ys[2] - ys[0];
  add("rail-top", cylinder(len, 22, 12).rotateX(-90).translate(RX, ys[0], ZS + 1000).color(frame));
  add("rail-mid", cylinder(len, 16, 10).rotateX(-90).translate(RX, ys[0], ZS + 500).color(frame));
  add("rail-toe", blk(RX + 15, (ys[0] + ys[2]) / 2, ZS, 12, len, 120).color(frame));
}

return p.model();
