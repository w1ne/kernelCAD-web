// SPDX-License-Identifier: CC0-1.0
// Stage riser platform: a two-tier choir and band riser, the stepped
// platform a chorus or a drum kit stands on at the back of a stage.
// What makes it a riser rather than two boxes: carpeted deck tops inside
// aluminium edge frames with hi-vis step nosings, folding steel leg frames
// with diagonal braces under each tier, a tube guard rail on posts along the
// back of the top tier, a carpeted access step at the front and rubber feet.
// Generic visualization geometry at about real size (1.8 m wide, tiers at
// 0.3 m and 0.6 m), millimetres, Z up, front toward -Y, feet on z = 0.

meta({
  name: "stage-riser-platform",
  license: 'CC0-1.0',
  title: "Stage riser platform",
  description: "Two-tier choir and band riser at about real size: carpeted deck tops in aluminium edge frames with hi-vis step nosings, folding steel leg frames with diagonal braces under each tier, a tube guard rail on four posts along the back of the top tier, a carpeted front access step and rubber feet. Material controls: deck carpet, aluminium frame, steel legs, nosing. houseShow, choir and touring presets; with or without guard rail.",
  tags: ['riser', 'choir riser', 'stage riser', 'band riser', 'staging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rail = param('rail', 'guarded', { choices: ['guarded', 'open'], label: 'Back guard rail' });

const carpet = param('carpet', '#2a2d33', { label: 'Deck carpet' });
const frame = param('frame', '#b9c0c4', { label: 'Aluminium edge frame' });
const steel = param('steel', '#3a4147', { label: 'Steel legs and rail' });
const nosing = param('nosing', '#e6b31e', { label: 'Step nosing' });

presets({
  houseShow: { carpet: '#2a2d33', frame: '#b9c0c4', steel: '#3a4147', nosing: '#e6b31e' },
  choir: { carpet: '#6b2430', frame: '#c8b07a', steel: '#2e3236', nosing: '#d9d4c6' },
  touring: { carpet: '#1b1c1e', frame: '#2a2d30', steel: '#d4a31f', nosing: '#f2f2ee' },
});

const RUBBER = '#18191b';

const p = assembly("stage-riser-platform");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 1800;
const D = 600; // tier depth
const FH = 60; // frame depth
type Tier = [string, number, number]; // id, y centre, top z
const tiers: Tier[] = [["low", -D / 2, 300], ["high", D / 2, 600]];

for (const [id, yc, zt] of tiers) {
  const zf = zt - FH;
  add(`carpet-${id}`, blk(0, yc, zt - 20, W - 20, D - 20, 20).color(carpet));
  for (const [s, y] of [["f", yc - D / 2 + 15], ["b", yc + D / 2 - 15]] as [string, number][])
    add(`frame-${id}-${s}`, blk(0, y, zf, W, 30, FH).color(frame));
  for (const [s, x] of [["l", -W / 2 + 15], ["r", W / 2 - 15]] as [string, number][])
    add(`frame-${id}-${s}`, blk(x, yc, zf, 30, D - 60, FH).color(frame));
  add(`nosing-${id}`, blk(0, yc - D / 2 + 18, zt - 2, W - 20, 36, 6).color(nosing));

  // Folding leg frames at each end and in the middle: two tube legs, a top
  // rail, a foot rail and a diagonal brace.
  const legH = zf - 20;
  for (const [s, x] of [["l", -W / 2 + 70], ["m", 0], ["r", W / 2 - 70]] as [string, number][]) {
    for (const [e, y] of [["f", yc - D / 2 + 70], ["b", yc + D / 2 - 70]] as [string, number][]) {
      add(`leg-${id}-${s}-${e}`, cylinder(legH, 18, 12).translate(x, y, 20).color(steel));
      add(`foot-${id}-${s}-${e}`, cylinder(20, 28, 12).translate(x, y, 0).color(RUBBER));
    }
    const span = D - 140;
    add(`leg-rail-${id}-${s}`, cylinder(span, 12, 10).rotateX(-90).translate(x, yc - span / 2, 90).color(steel));
    const rise = legH - 130;
    const ang = (Math.atan2(span, rise) * 180) / Math.PI;
    add(`leg-brace-${id}-${s}`, cylinder(Math.hypot(span, rise), 10, 10).rotateX(-ang).translate(x, yc - span / 2, 90).color(steel));
  }
}

// Front access step.
add("step-carpet", blk(0, -D - 170, 130, 700, 300, 20).color(carpet));
add("step-box", blk(0, -D - 170, 20, 700, 300, 110).color(frame));
add("step-nosing", blk(0, -D - 300, 148, 680, 36, 6).color(nosing));
for (const [s, x] of [["l", -300], ["r", 300]] as [string, number][])
  add(`step-foot-${s}`, blk(x, -D - 170, 0, 80, 260, 20).color(RUBBER));

// Guard rail on posts along the back of the top tier.
if (rail.value === 'guarded') {
  const ZR = 600;
  const RY = D - 30;
  for (const [i, x] of [-W / 2 + 60, -W / 6, W / 6, W / 2 - 60].entries()) {
    add(`rail-post-${i}`, cylinder(1000, 20, 12).translate(x, RY, ZR).color(steel));
    add(`rail-clamp-${i}`, blk(x, RY, ZR - 60, 70, 70, 60).color(frame));
  }
  add("rail-top", cylinder(W - 120, 22, 12).rotateY(90).translate(-W / 2 + 60, RY, ZR + 1000).color(steel));
  add("rail-mid", cylinder(W - 120, 16, 10).rotateY(90).translate(-W / 2 + 60, RY, ZR + 500).color(steel));
}

return p.model();
