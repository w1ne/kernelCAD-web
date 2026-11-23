// SPDX-License-Identifier: CC0-1.0
// Returns drop bin: the wheeled collection cabinet by a store's customer
// service desk where shoppers post returned items and parcels. What makes
// it a drop bin rather than a waste bin: a deposit slot with a rain hood
// and pull handle cut into the front, a sloping hinged lid you can't post
// through, a "returns" sign panel with a big arrow pointing up at the slot,
// a lockable emptying door low on the front, corner bumpers and swivel
// castors. Generic visualization geometry at about real size (0.7 m wide,
// 1.13 m tall), millimetres, Z up, front on -Y.

meta({
  name: "returns-drop-bin",
  license: 'CC0-1.0',
  title: "Returns drop bin",
  description: "Wheeled store returns collection cabinet at about real size: deposit slot with rain hood and pull handle, sloping hinged lid, sign panel with an arrow pointing to the slot, lockable emptying door, corner bumpers and four swivel castors. Material controls: body, lid and hood, sign panel, hardware. storeBlue, postRed, ecoGreen and nightRestock presets.",
  tags: ['returns bin', 'drop box', 'collection bin', 'parcel drop', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#2f6f9e', { label: 'Body polyethylene' });
const lid = param('lid', '#f2b632', { label: 'Lid and hood' });
const sign = param('sign', '#f4f1ea', { label: 'Sign panel' });
const hardware = param('hardware', '#b7c0c3', { label: 'Hardware steel' });

presets({
  storeBlue: { body: '#2f6f9e', lid: '#f2b632', sign: '#f4f1ea', hardware: '#b7c0c3' },
  postRed: { body: '#c8312a', lid: '#2b2f33', sign: '#f2c230', hardware: '#c4cbcf' },
  ecoGreen: { body: '#3f7d4e', lid: '#d6e0d5', sign: '#f4f1ea', hardware: '#9da8aa' },
  nightRestock: { body: '#354750', lid: '#66747a', sign: '#c9b27e', hardware: '#7d878c' },
});

const p = assembly("returns-drop-bin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const W = 700;
const YF = -320;
const YB = 320;
const Z0 = 110;
const ZF = 960;
const ZB = 1100;

// Body with the deposit slot cut into its front, dark throat behind it.
const slot = blk(0, YF, 800, 420, 90, 70);
add("body", profileYZ([[YF, Z0], [YB, Z0], [YB, ZB], [YF, ZF]], W).subtract(slot).color(body));
add("slot-throat", blk(0, YF + 44, 800, 420, 4, 70).color('#1d2023'));
add("rain-hood", profileYZ([[YF + 2, 880], [YF - 95, 880], [YF - 95, 895], [YF + 2, 940]], W - 140).color(lid));
add("pull-handle", blk(0, YF - 40, 765, 320, 22, 20).color(hardware));
for (const [k, x] of [['l', -150], ['r', 150]]) add(`handle-post-${k}`, blk(x, YF - 20, 765, 20, 22, 20).color(hardware));

// Sloping lid hinged at the back.
add("lid", profileYZ([[YF - 12, ZF - 4], [YB + 10, ZB - 4], [YB + 10, ZB + 28], [YF - 12, ZF + 28]], W + 24).color(lid));
for (const [k, x] of [['l', -230], ['r', 230]]) {
  add(`hinge-${k}`, cylinder(80, 18, 10).rotateY(90).translate(x - 40, YB + 14, ZB - 10).color(hardware));
}

// Sign panel with an arrow pointing up at the slot and a few text bars.
const SY = YF - 3;
add("sign-panel", blk(0, SY, 520, W - 120, 6, 220).color(sign));
add("arrow", profileXZ([[-55, 560], [55, 560], [55, 630], [110, 630], [0, 720], [-110, 630], [-55, 630]], 6).translate(0, SY - 4, 0).color(lid));
for (const [i, w] of [[0, 120], [1, 90]]) {
  add(`text-l-${i}`, blk(-210, SY - 4, 640 - i * 50, w, 4, 22).color('#2b2f33'));
  add(`text-r-${i}`, blk(210, SY - 4, 640 - i * 50, w, 4, 22).color('#2b2f33'));
}

// Lockable emptying door: shadow-gap outline, cam lock and a lift handle.
const DZ = 160;
const DH = 320;
const DW = W - 160;
add("door-gap-top", blk(0, YF - 2, DZ + DH, DW, 4, 8).color('#1d2023'));
add("door-gap-bottom", blk(0, YF - 2, DZ, DW, 4, 8).color('#1d2023'));
for (const [k, x] of [['l', -DW / 2], ['r', DW / 2]]) add(`door-gap-${k}`, blk(x, YF - 2, DZ, 8, 4, DH + 8).color('#1d2023'));
add("cam-lock", cylinder(16, 22, 12).rotateX(90).translate(DW / 2 - 60, YF + 2, DZ + DH - 60).color(hardware));
add("lock-key-slot", blk(DW / 2 - 60, YF - 16, DZ + DH - 75, 6, 4, 30).color('#1d2023'));
add("door-pull", blk(0, YF - 18, DZ + 40, 200, 30, 24).color(hardware));

// Corner bumpers and a kick strip.
for (const [k, x, y] of [['lf', -1, -1], ['rf', 1, -1], ['lb', -1, 1], ['rb', 1, 1]]) {
  add(`bumper-${k}`, blk(x * (W / 2 - 8), y * (YB - 8), Z0, 30, 30, 260).color('#2b2f33'));
}
add("kick-strip", blk(0, YF - 6, Z0, W - 40, 14, 40).color('#2b2f33'));

// Swivel castors: fork under a plate, wheel trimmed flat at the floor.
for (const [k, x, y] of [['lf', -1, -1], ['rf', 1, -1], ['lb', -1, 1], ['rb', 1, 1]]) {
  const cx = x * (W / 2 - 90);
  const cy = y * (YB - 90);
  add(`castor-plate-${k}`, blk(cx, cy, Z0 - 12, 100, 100, 12).color(hardware));
  add(`castor-fork-${k}`, blk(cx, cy + 10, 60, 50, 60, Z0 - 72).color(hardware));
  add(`castor-wheel-${k}`, cylinder(36, 48, 14).rotateY(90).translate(cx - 18, cy, 45).subtract(blk(cx, cy, -60, 60, 120, 60)).color('#2b2f33'));
}

return p.model();
