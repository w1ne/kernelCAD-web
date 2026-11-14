// SPDX-License-Identifier: CC0-1.0
// Queue stanchion: a retractable-belt post for checkout and service queues.
// What makes it a belt stanchion rather than a pole: a heavy domed cast base
// with a rubber floor ring, a polished post, a belt cassette head with the
// webbing belt pulled part-way out to its end clip, four receiver slots
// round the head so belts can join from any side, and an optional sign
// topper. Generic visualization geometry at about real size (360 mm base,
// 1 m tall), millimetres, Z up, front toward -Y, base on z = 0.

meta({
  name: "queue-stanchion",
  license: 'CC0-1.0',
  title: "Queue stanchion",
  description: "Retractable-belt queue post at about real size: heavy domed cast base with a rubber floor ring, polished post, belt cassette head with the webbing belt pulled out to its end clip, four receiver slots round the head and an optional 'please queue here' sign topper. Material controls: post finish, base, belt webbing, sign. chrome, blackOut and brass presets; topper choice.",
  tags: ['queue stanchion', 'retractable belt', 'crowd control', 'queue post', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const post = param('post', '#c9ced2', { label: 'Post finish' });
const base = param('base', '#3a3e42', { label: 'Cast base' });
const belt = param('belt', '#c8302c', { label: 'Belt webbing' });
const sign = param('sign', '#f4f1e8', { label: 'Sign card' });
const topper = param('topper', 'sign', { choices: ['sign', 'none'], label: 'Topper' });

presets({
  chrome: { post: '#c9ced2', base: '#3a3e42', belt: '#c8302c', sign: '#f4f1e8' },
  blackOut: { post: '#2b2e31', base: '#1d1f21', belt: '#2f5fa8', sign: '#f2f2f0' },
  brass: { post: '#c39a4a', base: '#4a3a2a', belt: '#7a1f2c', sign: '#f1e6cc' },
});

const p = assembly("queue-stanchion");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [r, z] revolved about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Domed cast base on a rubber ring.
add("rubber-ring", turned([[0, 0], [180, 0], [180, 10], [0, 10]]).color('#151618'));
add("base", turned([[0, 10], [176, 10], [172, 26], [140, 48], [80, 64], [32, 72], [0, 72]]).color(base));
add("collar", turned([[0, 64], [34, 64], [30, 92], [0, 92]]).color(post));

// Post and head.
add("post", cylinder(780, 31, 16).translate(0, 0, 90).color(post));
const HZ = 870;
add("head", turned([[0, HZ], [36, HZ], [36, HZ + 110], [30, HZ + 124], [0, HZ + 124]]).color(post));
add("head-band", cylinder(18, 37, 16).translate(0, 0, HZ + 40).color(base));

// Four receiver slots round the head.
for (let k = 0; k < 4; k++) {
  const slot = blk(0, -36, HZ + 20, 14, 6, 70).color('#151618');
  add(`slot-${k}`, slot.rotateZ(45 + k * 90));
}

// Belt pulled out toward -X, with its end clip.
const BL = 520;
add("belt", blk(-36 - BL / 2, 0, HZ + 34, BL, 3, 50).color(belt));
add("belt-mouth", blk(-38, 0, HZ + 28, 10, 14, 62).color('#151618'));
add("clip", blk(-36 - BL - 14, 0, HZ + 26, 28, 16, 66).color(post));
add("clip-tongue", blk(-36 - BL - 34, 0, HZ + 38, 16, 6, 42).color(post));

// Optional sign topper: frame on a stem with a printed card facing -Y.
if (topper.value === 'sign') {
  add("topper-stem", cylinder(40, 8, 8).translate(0, 0, HZ + 124).color(post));
  add("topper-frame", blk(0, 0, HZ + 160, 300, 14, 190).color(post));
  add("topper-card", blk(0, -8, HZ + 170, 280, 2, 170).color(sign));
  add("topper-band", blk(0, -10, HZ + 290, 280, 1, 40).color(belt));
  // Arrow pointing along the belt.
  add("arrow", extrudePolygon([[60, 0], [-20, 0], [-20, -22], [-70, 18], [-20, 58], [-20, 36], [60, 36]], 2)
    .rotateX(90).translate(0, -10, HZ + 200).color('#2b2e31'));
}

return p.model();
