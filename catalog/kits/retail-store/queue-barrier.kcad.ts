// SPDX-License-Identifier: CC0-1.0
// Queue barrier: a pair of retractable-belt posts at a checkout queue.
// What makes it a belt barrier rather than a rope stanchion: domed cast
// bases on rubber rings, polished tube posts, a fat cassette head on each
// post with a domed cap, and a flat printed webbing belt pulled taut from
// the left cassette into the right post's receiver clip. Options add a
// second, lower belt and a "please queue here" sign frame on the left post.
// Generic visualization geometry at about real size (1.35 m wide, 0.97 m
// tall), millimetres, Z up, front on -Y.

meta({
  name: "queue-barrier",
  license: 'CC0-1.0',
  title: "Queue barrier",
  description: "Pair of retractable-belt queue posts at about real size: domed cast bases on rubber rings, polished tube posts, cassette heads with domed caps, a flat printed belt pulled taut into a receiver clip. Options: single or double belt, and a sign frame on the left post. Material controls: post finish, base casting, belt fabric and belt print. chromeRed, blackBlue and brassBurgundy presets.",
  tags: ['queue barrier', 'retractable belt', 'stanchion', 'crowd control', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const post = param('post', '#c4cbcf', { label: 'Post finish' });
const base = param('base', '#2a2e31', { label: 'Base casting' });
const belt = param('belt', '#c0332f', { label: 'Belt fabric' });
const print = param('print', '#f4f1ea', { label: 'Belt print' });
const belts = param('belts', 'single', { choices: ['single', 'double'], label: 'Belts' });
const topper = param('topper', 'sign', { choices: ['none', 'sign'], label: 'Sign frame' });

presets({
  chromeRed: { post: '#c4cbcf', base: '#2a2e31', belt: '#c0332f', print: '#f4f1ea' },
  blackBlue: { post: '#2b2f33', base: '#1c1f22', belt: '#2a5fae', print: '#f4f1ea' },
  brassBurgundy: { post: '#c9a24a', base: '#3a2a20', belt: '#6e1f2e', print: '#e9d29a' },
});

const p = assembly("queue-barrier");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const X = 500;
const HEAD = 860;
const dome = turned([[0, 0], [168, 0], [168, 8], [150, 22], [62, 50], [38, 62], [0, 62]]);
const cap = turned([[0, 0], [44, 0], [44, 8], [30, 24], [0, 30]]);

for (const [k, s] of [['l', -1], ['r', 1]]) {
  const x = s * X;
  add(`rubber-${k}`, cylinder(8, 160, 20).translate(x, 0, 0).color('#151719'));
  add(`base-${k}`, dome.translate(x, 0, 8).color(base));
  add(`post-${k}`, cylinder(HEAD - 60, 32, 14).translate(x, 0, 60).color(post));
  add(`head-${k}`, cylinder(100, 42, 16).translate(x, 0, HEAD).color(post));
  add(`head-band-${k}`, cylinder(18, 43, 16).translate(x, 0, HEAD + 6).color(belt));
  add(`cap-${k}`, cap.translate(x, 0, HEAD + 100).color(post));
  // Receiver slots on the four sides of the head (the -Y one faces the camera).
  add(`slot-${k}`, blk(x, -42, HEAD + 38, 30, 4, 54).color('#151719'));
}

// Taut printed belt from the left cassette into the right receiver clip.
const beltRun = (z: number, id: string) => {
  const x0 = -X + 40;
  const x1 = X - 50;
  add(`belt-${id}`, blk((x0 + x1) / 2, 0, z, x1 - x0, 3, 50).color(belt));
  for (let i = 0; i < 6; i++) {
    const x = x0 + 70 + i * 150;
    add(`print-${id}-${i}`, blk(x, -2.5, z + 18, i % 3 === 1 ? 50 : 90, 2, 14).color(print));
  }
  add(`clip-${id}`, blk(x1 + 6, 0, z - 6, 24, 14, 62).color(post));
  add(`clip-tab-${id}`, blk(x1 - 10, 0, z + 4, 12, 8, 42).color(base));
};
beltRun(HEAD + 28, 'top');
if (belts.value === 'double') {
  // Second cassette lower on the post, same belt.
  for (const [k, s] of [['l', -1], ['r', 1]]) add(`lower-head-${k}`, cylinder(80, 38, 16).translate(s * X, 0, 560).color(post));
  beltRun(576, 'low');
}

// A4 sign frame on the left post, raked back toward the queue.
if (topper.value === 'sign') {
  const sign = (s: Shape) => s.rotateX(-20).translate(-X, 0, HEAD + 130);
  add("sign-stem", cylinder(50, 10, 10).translate(-X, 0, HEAD + 100).color(post));
  add("sign-frame", sign(blk(0, 0, 0, 300, 10, 220)).color(post));
  add("sign-card", sign(blk(0, -6, 12, 276, 4, 196)).color(print));
  add("sign-band", sign(blk(0, -9, 160, 276, 4, 36)).color(belt));
  add("sign-arrow", sign(blk(-20, -9, 60, 160, 4, 40).union(blk(70, -9, 50, 40, 4, 60))).color(belt));
  add("sign-text", sign(blk(0, -9, 120, 220, 4, 14)).color(base));
}

return p.model();
