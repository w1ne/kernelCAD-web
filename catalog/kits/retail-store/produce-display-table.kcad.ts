// SPDX-License-Identifier: CC0-1.0
// Produce display table: the tiered timber island in the middle of the
// fruit and veg section. What makes it a produce table rather than a shelf:
// three trays that step up toward the back and rake forward, each split
// into three bins with produce heaped over a low front lip, chalkboard
// price cards clipped to the lips, staircase timber side cheeks, a slatted
// front fascia on a dark plinth and a "fresh" header board on two posts.
// Generic visualization geometry at about real size (1.8 m wide, 1.75 m
// tall), millimetres, Z up, front on -Y.

meta({
  name: "produce-display-table",
  license: 'CC0-1.0',
  title: "Produce display table",
  description: "Tiered timber produce island at about real size: three forward-raked trays stepping up to the back, each split into three bins of heaped produce over a low front lip, chalkboard price cards, staircase side cheeks, slatted front fascia on a dark plinth and a header board on posts. Material controls: timber, frame steel, greens and fruit. farmMarket, modernWhite and autumnHarvest presets.",
  tags: ['produce table', 'produce display', 'fruit stand', 'vegetable display', 'market stall', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#b08a58', { label: 'Timber' });
const frame = param('frame', '#2f3a33', { label: 'Frame steel and plinth' });
const greens = param('greens', '#4f9a3a', { label: 'Greens (leafy produce)' });
const fruitTone = param('fruit', '#e0472f', { label: 'Fruit' });

presets({
  farmMarket: { timber: '#b08a58', frame: '#2f3a33', greens: '#4f9a3a', fruit: '#e0472f' },
  modernWhite: { timber: '#ece8df', frame: '#9aa3a8', greens: '#6cb44a', fruit: '#f2a51a' },
  autumnHarvest: { timber: '#6e5133', frame: '#1f2224', greens: '#8a9a3a', fruit: '#d8662a' },
});

const p = assembly("produce-display-table");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1800;
const RAKE = 12;
const SN = Math.sin((RAKE * Math.PI) / 180);
const TD = 300;
const tiers = [[-460, 560], [-160, 800], [140, 1040]];
const WALL = 130;

// Dark plinth, slatted front fascia under the bottom tray, and staircase cheeks.
add("plinth", blk(0, -10, 0, W - 40, 860, 100).color(frame));
add("fascia", blk(0, -462, 100, W, 12, tiers[0][1] - 100).color(timber));
for (let i = 1; i < 4; i++) add(`fascia-groove-${i}`, blk(0, -470, 100 + i * 115, W, 4, 8).color('#4a3a28'));
const cheek = [[-470, 0], [450, 0], [450, tiers[2][1] + TD * SN + WALL]];
for (let t = 2; t >= 0; t--) {
  const [y, z] = tiers[t];
  cheek.push([y - 10, z + WALL]);
  if (t > 0) cheek.push([y - 10, tiers[t - 1][1] + TD * SN + WALL]);
}
cheek.push([-470, 100]);
for (const [k, s] of [['l', -1], ['r', 1]]) {
  add(`cheek-${k}`, profileYZ(cheek, 20).translate(s * (W / 2 + 10), 0, 0).color(timber));
  add(`corner-post-${k}`, blk(s * (W / 2 + 10), -468, 0, 40, 40, tiers[0][1] + WALL).color(frame));
}

// Trays: built with the front lip on y = 0, then raked about that edge.
const fruitBall = sphere(46);
const heap = sphere(100).scale([2.8, 1.3, 1.1]);
const binColours = [greens, fruitTone, '#7b3d86'];
tiers.forEach(([y0, z0], t) => {
  const rake = (s: Shape) => s.rotateX(RAKE).translate(0, y0, z0);
  if (t > 0) add(`riser-${t}`, blk(0, y0 - 2, tiers[t - 1][1], W, 12, z0 - tiers[t - 1][1] + 20).color(timber));
  add(`tray-floor-${t}`, rake(blk(0, TD / 2, 0, W, TD, 20)).color(timber));
  add(`tray-lip-${t}`, rake(blk(0, 8, 0, W, 16, 80)).color(timber));
  add(`tray-back-${t}`, rake(blk(0, TD - 8, 0, W, 16, 170)).color(timber));
  for (const s of [-1, 1]) add(`divider-${t}-${s < 0 ? 'l' : 'r'}`, rake(blk(s * 295, TD / 2, 0, 16, TD - 30, 110)).color(timber));
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 590;
    const tone = binColours[(i + t) % 3];
    add(`heap-${t}-${i}`, rake(heap.translate(x, TD / 2 + 5, 60)).color(tone));
    for (let k = 0; k < 5; k++) {
      const front = k < 3;
      const px = front ? x - 170 + k * 170 : x - 85 + (k - 3) * 170;
      add(`produce-${t}-${i}-${k}`, rake(fruitBall.translate(px, front ? TD / 2 - 55 : TD / 2 + 50, front ? 128 : 150)).color(tone));
    }
    // Chalkboard price card clipped to the front lip.
    add(`card-${t}-${i}`, rake(blk(x - 170, -4, 20, 150, 6, 110)).color('#24292b'));
    add(`card-chalk-${t}-${i}`, rake(blk(x - 170, -8, 72, 110, 3, 16)).color('#f4f1ea'));
    add(`card-price-${t}-${i}`, rake(blk(x - 185, -8, 38, 70, 3, 22)).color(i === 1 ? '#f2c94c' : '#f4f1ea'));
  }
});

// Header board on two posts behind the top tray.
const topZ = tiers[2][1] + TD * SN + WALL;
for (const [k, x] of [['l', -620], ['r', 620]]) add(`sign-post-${k}`, cylinder(1720 - topZ + 60, 18, 12).translate(x, 430, topZ - 60).color(frame));
add("sign-board", blk(0, 412, 1500, 1400, 24, 240).color(timber));
add("sign-panel", blk(0, 398, 1525, 1260, 6, 190).color(greens));
add("sign-text", blk(-90, 393, 1600, 760, 4, 60).color('#f4f1ea'));
add("sign-sub", blk(-210, 393, 1550, 520, 4, 26).color(fruitTone));
add("sign-dot", cylinder(4, 60, 16).rotateX(90).translate(480, 396, 1620).color(fruitTone));

return p.model();
