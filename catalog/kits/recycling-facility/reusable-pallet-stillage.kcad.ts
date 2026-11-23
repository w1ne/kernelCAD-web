// SPDX-License-Identifier: CC0-1.0
// Reusable pallet stillage: the steel post pallet a recovery site uses to
// move sorted crates and returnable trays around the yard and on trucks.
// What makes it a stillage rather than a pallet: a welded square tube base
// standing on nine feet so forks enter from all four sides, timber deck
// boards, four corner posts with stacking cups on top (the feet of the next
// stillage drop into them), side rails on three sides, a lift-out front
// bar, and a yellow ID plate. It carries two tiers of returnable plastic
// crates.
// Generic visualization geometry at about real size (1200 x 1000 mm base,
// posts about 1150 mm high), millimetres, Z up, open front on -Y.

meta({
  name: "reusable-pallet-stillage",
  license: 'CC0-1.0',
  title: "Reusable pallet stillage",
  description: "Steel post pallet stillage at about real size: welded square tube base on nine four-way fork feet, timber deck boards, four corner posts with stacking cups, side rails on three sides, a lift-out front bar and an ID plate, loaded with two tiers of returnable plastic crates. Load choice (crates, empty). Material controls: steel frame, timber deck, plastic crates, ID plate. depotBlue, galvanised and weathered presets.",
  tags: ['stillage', 'post pallet', 'steel pallet', 'stacking pallet', 'returnable crates', 'reusable packaging', 'recycling', 'materials recovery', 'logistics', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#2f5fa8', { label: 'Frame, posts and rails (painted steel)' });
const timber = param('timber', '#b48a5a', { label: 'Deck boards (timber)' });
const crates = param('crates', '#2e9a63', { label: 'Returnable crates (plastic)' });
const plate = param('plate', '#f2c230', { label: 'ID plate and crate labels' });
const load = param('load', 'crates', { choices: ['crates', 'empty'], label: 'Load' });

presets({
  depotBlue: { steel: '#2f5fa8', timber: '#b48a5a', crates: '#2e9a63', plate: '#f2c230' },
  galvanised: { steel: '#a5adb0', timber: '#c09a68', crates: '#d0533a', plate: '#ffffff' },
  weathered: { steel: '#5a5e58', timber: '#8a7053', crates: '#3c6f8c', plate: '#c9a640' },
});

const p = assembly("reusable-pallet-stillage");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 1200;
const D = 1000;
const FH = 110;
const TUBE = 60;
const DECK = FH + TUBE;
const TOP = 1150;

// Nine feet, a perimeter of square tube and two cross members.
for (const fx of [-1, 0, 1]) {
  for (const fy of [-1, 0, 1]) {
    add(`foot-${fx + 1}${fy + 1}`, blk(fx * (W / 2 - 60), fy * (D / 2 - 60), 0, 120, 120, FH).color(steel));
  }
}
add("tube-front", blk(0, -D / 2 + TUBE / 2, FH, W, TUBE, TUBE).color(steel));
add("tube-back", blk(0, D / 2 - TUBE / 2, FH, W, TUBE, TUBE).color(steel));
add("tube-left", blk(-W / 2 + TUBE / 2, 0, FH, TUBE, D - 2 * TUBE, TUBE).color(steel));
add("tube-right", blk(W / 2 - TUBE / 2, 0, FH, TUBE, D - 2 * TUBE, TUBE).color(steel));
add("tube-mid", blk(0, 0, FH, TUBE, D - 2 * TUBE, TUBE).color(steel));

// Timber deck boards across the frame, with gaps.
for (let i = 0; i < 7; i++) add(`deck-board-${i}`, blk(0, -D / 2 + 90 + i * ((D - 180) / 6), DECK, W - 40, 120, 22).color(timber));

// Corner posts with stacking cups.
const PZ = DECK;
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const x = sx * (W / 2 - 40);
  const y = sy * (D / 2 - 40);
  const t = `${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`;
  add(`post-${t}`, blk(x, y, PZ, 70, 70, TOP - PZ).color(steel));
  add(`post-gusset-${t}`, blk(x - sx * 50, y, PZ, 40, 12, 120).color(steel));
  add(`stack-cup-${t}`, turned([[0, 0], [48, 0], [64, 70], [56, 70], [40, 12], [0, 12]]).translate(x, y, TOP).color(steel));
}

// Rails: back and both sides get two rails, the front a lift-out top bar.
for (const z of [620, TOP - 50]) {
  add(`rail-back-${z}`, blk(0, D / 2 - 40, z, W - 150, 40, 40).color(steel));
  add(`rail-left-${z}`, blk(-W / 2 + 40, 0, z, 40, D - 150, 40).color(steel));
  add(`rail-right-${z}`, blk(W / 2 - 40, 0, z, 40, D - 150, 40).color(steel));
}
for (const sx of [-1, 1]) add(`stay-${sx < 0 ? 'l' : 'r'}`, blk(sx * (W / 2 - 40), 0, DECK + 22, 30, 30, 600).color(steel));
add("front-bar", blk(0, -D / 2 + 40, TOP - 60, W - 150, 40, 40).color(steel));
for (const sx of [-1, 1]) add(`front-bar-hook-${sx < 0 ? 'l' : 'r'}`, blk(sx * (W / 2 - 92), -D / 2 + 40, TOP - 100, 30, 46, 80).color(steel));
add("id-plate", blk(-W / 4, -D / 2 - 2, FH + 8, 220, 6, 44).color(plate));
add("id-plate-code", blk(-W / 4 - 40, -D / 2 - 6, FH + 20, 110, 3, 18).color(steel));

// Two tiers of returnable crates (520 x 400 x 300), open tops showing.
if (load.value === 'crates') {
  const CW = 520;
  const CD = 400;
  const CH = 300;
  let n = 0;
  for (let tier = 0; tier < 2; tier++) {
    for (const cx of [-CW / 2 - 6, CW / 2 + 6]) {
      for (const cy of [-CD / 2 - 5, CD / 2 + 5]) {
        const z = DECK + 22 + tier * CH;
        const crate = blk(cx, cy, z, CW, CD, CH - 4)
          .subtract(blk(cx, cy, z + 20, CW - 36, CD - 36, CH))
          .subtract(blk(cx, cy, z + CH - 90, 140, CD + 20, 45))
          .subtract(blk(cx, cy, z + CH - 90, CW + 20, 120, 45));
        add(`crate-${n}`, crate.color(crates));
        if (cy < 0 && tier === 1) add(`crate-label-${n}`, blk(cx + 150, cy - CD / 2 - 2, z + 60, 140, 4, 80).color(plate));
        n++;
      }
    }
  }
}

return p.model();
