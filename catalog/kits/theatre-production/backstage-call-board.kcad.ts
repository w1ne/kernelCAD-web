// SPDX-License-Identifier: CC0-1.0
// Backstage call board: the freestanding notice board by the stage door
// where the company signs in and reads the call times, rehearsal report
// and notes, with a clock above it so nobody can claim they missed a call.
// What makes it a call board rather than a panel on legs: a framed cork
// board with pinned sheets and coloured push pins, a sign-in clipboard with
// a pen on a cord, a whiteboard strip with the day's calls, a marker ledge,
// a wall clock on the header, and two tube posts on splayed feet with
// rubber end caps.
// Generic visualization geometry at about real size (1.2 m wide, 2 m tall),
// millimetres, Z up, board face toward -Y, feet standing on z = 0.

meta({
  name: "backstage-call-board",
  license: 'CC0-1.0',
  title: "Backstage call board",
  description: "Freestanding stage-door call board at about real size: framed cork board with pinned call sheets, rehearsal report and notes held by coloured push pins, a sign-in clipboard with a pen on a cord, a whiteboard strip with ruled call times, a marker ledge with markers, a header with a round wall clock, and two tube posts on splayed feet with rubber end caps. Material controls: frame and posts, cork board, paper, push pins and markers. houseShow, touring and schoolHall presets.",
  tags: ['call board', 'callboard', 'notice board', 'sign-in board', 'stage door', 'backstage', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const frame = param('frame', '#2f353b', { label: 'Frame and posts' });
const cork = param('cork', '#b98a58', { label: 'Cork board' });
const paper = param('paper', '#f3f0e6', { label: 'Paper sheets' });
const pins = param('pins', '#d23b2f', { label: 'Push pins and markers' });

presets({
  houseShow: { frame: '#2f353b', cork: '#b98a58', paper: '#f3f0e6', pins: '#d23b2f' },
  touring: { frame: '#1d1f22', cork: '#8a6a4a', paper: '#fff6c9', pins: '#2a7fd4' },
  schoolHall: { frame: '#7a8a96', cork: '#c99e6a', paper: '#eaf3ff', pins: '#3aa64a' },
});

const RUBBER = '#18191b';
const INK = '#2b3a55';
const WHITE = '#f7f8f6';

const p = assembly("backstage-call-board");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongY = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const W = 1200;
const Z0 = 700; // board bottom
const H = 1000; // board height
const ZH = Z0 + H; // header base

// Posts on splayed feet with end caps.
for (const [s, x] of [["left", -W / 2 - 30], ["right", W / 2 + 30]] as [string, number][]) {
  add(`post-${s}`, cylinder(ZH + 140 - 40, 22, 14).translate(x, 0, 40).color(frame));
  add(`foot-${s}`, alongY(560, 20).translate(x, 280, 40).color(frame));
  add(`foot-hub-${s}`, sphere(26).translate(x, 0, 40).color(frame));
  for (const y of [-280, 280]) add(`foot-cap-${s}-${y < 0 ? 'f' : 'b'}`, alongY(50, 26).translate(x, y + (y < 0 ? 0 : 50), 23).subtract(box(80, 200, 30, true).translate(x, y, -15)).color(RUBBER));
}

// Framed cork board.
add("board-back", blk(0, 0, Z0, W, 30, H).color(frame));
add("cork", blk(0, -18, Z0 + 40, W - 80, 6, H - 80).color(cork));
add("frame-top", blk(0, -22, Z0 + H - 40, W, 14, 40).color(frame));
add("frame-bottom", blk(0, -22, Z0, W, 14, 40).color(frame));
for (const x of [-W / 2 + 20, W / 2 - 20]) add(`frame-side-${x < 0 ? 'l' : 'r'}`, blk(x, -22, Z0, 40, 14, H).color(frame));

// Header with clock.
add("header", blk(0, 0, ZH, W + 100, 50, 140).color(frame));
const CZ = ZH + 240;
add("clock-bracket", blk(0, 0, ZH + 130, 80, 30, 40).color(frame));
add("clock-rim", alongY(50, 130, 24).translate(0, 10, CZ).color(frame));
add("clock-face", alongY(6, 116, 24).translate(0, -40, CZ).color(WHITE));
add("clock-hour", box(14, 4, 70, true).translate(0, 0, 35).rotateY(-60).translate(0, -48, CZ).color(RUBBER));
add("clock-minute", box(10, 4, 100, true).translate(0, 0, 50).rotateY(20).translate(0, -50, CZ).color(RUBBER));
add("clock-second", box(4, 3, 100, true).translate(0, 0, 40).rotateY(150).translate(0, -52, CZ).color(pins));
for (let k = 0; k < 12; k++) add(`clock-tick-${k}`, box(8, 3, k % 3 === 0 ? 22 : 12, true).translate(0, 0, 100).rotateY(k * 30).translate(0, -45, CZ).color(RUBBER));

// Pinned sheets: call sheet, rehearsal report, notes; slight tilts.
const sheets: [string, number, number, number, number, number][] = [
  ["call-sheet", -360, Z0 + 520, 210, 297, -3],
  ["rehearsal-report", -110, Z0 + 540, 210, 297, 2],
  ["notes-a", 120, Z0 + 600, 150, 150, -6],
  ["notes-b", 300, Z0 + 560, 210, 260, 4],
  ["costume-list", -260, Z0 + 140, 210, 297, 5],
];
sheets.forEach(([id, x, z, w, h, tilt], i) => {
  add(`sheet-${id}`, box(w, 2, h, true).rotateY(tilt).translate(x, -22, z + h / 2).color(i === 2 ? '#f7e26b' : paper));
  for (let r = 0; r < Math.floor(h / 45); r++)
    add(`sheet-${id}-line-${r}`, box(w - 50, 1, 5, true).rotateY(tilt).translate(x, -24, z + h - 40 - r * 40).color(INK));
  add(`pin-${id}`, sphere(9).translate(x, -30, z + h - 14).color(i % 2 ? '#2a7fd4' : pins));
});

// Sign-in clipboard with a pen on a cord.
const CX = 300;
const CBZ = Z0 + 90;
add("clipboard", box(240, 8, 330, true).rotateY(-2).translate(CX, -26, CBZ + 165).color('#8a6b45'));
add("clipboard-sheet", box(210, 2, 280, true).rotateY(-2).translate(CX, -31, CBZ + 150).color(paper));
add("clipboard-clip", box(110, 14, 34, true).translate(CX, -32, CBZ + 315).color(frame));
for (let r = 0; r < 6; r++) add(`sign-in-row-${r}`, box(180, 1, 4, true).translate(CX, -33, CBZ + 250 - r * 36).color(INK));
add("pen-cord", box(3, 3, 180, true).rotateY(12).translate(CX + 150, -30, CBZ + 220).color(RUBBER));
add("pen", cylinder(130, 6, 8).rotateY(-8).translate(CX + 165, -36, CBZ + 20).color(pins));

// Whiteboard strip with the day's calls.
add("whiteboard", blk(0, -24, Z0 + 860, W - 140, 4, 90).color(WHITE));
for (const [k, x] of [[0, -360], [1, -40], [2, 280]] as [number, number][])
  add(`call-time-${k}`, blk(x, -27, Z0 + 885, 220, 2, 14).color(k === 1 ? pins : INK));

// Marker ledge under the board with three markers.
add("ledge", blk(0, -60, Z0 - 30, W - 60, 90, 30).color(frame));
add("ledge-lip", blk(0, -100, Z0, W - 60, 10, 18).color(frame));
for (const [k, x, c] of [[0, -200, pins], [1, -120, INK], [2, 260, '#2a7fd4']] as [number, number, string][])
  add(`marker-${k}`, cylinder(130, 10, 10).rotateY(90).translate(x - 65, -60, Z0 + 10).color(c));

return p.model();
