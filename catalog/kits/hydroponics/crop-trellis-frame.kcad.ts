// SPDX-License-Identifier: CC0-1.0
// Crop trellis frame: one bay of a high-wire trellis for vine crops such as
// tomatoes and cucumbers, with the crop growing up it.
// What makes it a crop trellis: two galvanised end posts with braced base
// plates carrying a top cross tube and the tensioned crop wire under it,
// a twine reel (roller hook) hung on the wire above every plant with the
// twine running straight down, and a vine winding up each twine with
// alternating leaves and red fruit trusses, all rooted in grow cubes on a
// slab in a gutter along the floor.
// Generic visualization geometry at about real size (1.6 m bay, 2.2 m to
// the wire), millimetres, Z up, front -Y.

meta({
  name: "crop-trellis-frame",
  license: 'CC0-1.0',
  title: "Crop trellis frame",
  description: "One bay of a high-wire vine-crop trellis at about real size: two galvanised end posts on braced base plates, a top cross tube with the tensioned crop wire and turnbuckle, four twine reels hung on the wire, twine dropping to each plant, vines winding up with alternating leaves and fruit trusses, rooted in grow cubes on a slab in a floor gutter. Material controls: frame, twine and reels, foliage and fruit, plus crop height. tomato, cucumber, pepper and weathered presets.",
  tags: ['trellis', 'crop wire', 'high wire', 'vine crop', 'tomato', 'cucumber', 'twine reel', 'roller hook', 'hydroponics', 'greenhouse', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#b4bbbe', { label: 'Posts and wire (galvanised steel)' });
const twine = param('twine', '#e7d9a8', { label: 'Twine and reels (polypropylene)' });
const foliage = param('foliage', '#3f7f35', { label: 'Foliage' });
const fruit = param('fruit', '#d33a2c', { label: 'Fruit' });
const crop = param('cropHeight', 'tall', { choices: ['young', 'mid', 'tall'], label: 'Crop height' });

presets({
  tomato: { frame: '#b4bbbe', twine: '#e7d9a8', foliage: '#3f7f35', fruit: '#d33a2c' },
  cucumber: { frame: '#c3c8ca', twine: '#f2f0ea', foliage: '#5a9a3e', fruit: '#2f6b2a' },
  pepper: { frame: '#9aa3a6', twine: '#d6c38a', foliage: '#376f2e', fruit: '#e8a220' },
  weathered: { frame: '#8a8f8c', twine: '#bfae80', foliage: '#6b8442', fruit: '#a8442e' },
});

const p = assembly("crop-trellis-frame");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const rod = (a: [number, number, number], b: [number, number, number], r: number, seg = 6) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const tilt = (Math.acos(d[2] / l) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(l, r, seg).rotateY(tilt).rotateZ(yaw).translate(a[0], a[1], a[2]);
};

const PX = 800, WZ = 2200;
// End posts: base plate, square tube, two gussets and a back brace leg.
for (const x of [-PX, PX]) {
  add(`base-plate-${x}`, blk(x, 0, 0, 220, 220, 10).color(frame));
  add(`post-${x}`, blk(x, 0, 10, 60, 60, WZ + 60).color(frame));
  add(`gusset-l-${x}`, extrudePolygon([[-30, 10], [-100, 10], [-30, 110]], 8).rotateX(90).translate(x, 4, 0).color(frame));
  add(`gusset-r-${x}`, extrudePolygon([[30, 10], [100, 10], [30, 110]], 8).rotateX(90).translate(x, 4, 0).color(frame));
  add(`brace-${x}`, rod([x, 40, 1400], [x, 700, 30], 20, 8).color(frame));
  add(`brace-foot-${x}`, blk(x, 705, 0, 120, 120, 12).color(frame));
  add(`post-cap-${x}`, blk(x, 0, WZ + 70, 72, 72, 10).color('#3b3f42'));
}
// Top cross tube, crop wire with a turnbuckle and the hooks it hangs from.
add("cross-tube", cylinder(2 * PX + 120, 24, 12).rotateY(90).translate(-PX - 60, 0, WZ + 40).color(frame));
add("crop-wire", cylinder(2 * PX - 60, 3, 6).rotateY(90).translate(-PX + 30, -40, WZ - 30).color(frame));
for (const x of [-PX + 30, PX - 30]) add(`wire-anchor-${x}`, blk(x, -20, WZ - 40, 20, 50, 80).color(frame));
add("turnbuckle", cylinder(110, 9, 8).rotateY(90).translate(PX - 200, -40, WZ - 30).color('#d0a43a'));

// Plants: one vine per twine, rooted in a cube on a slab in a floor gutter.
add("floor-gutter", blk(0, -40, 0, 2 * PX - 160, 260, 60).color(frame));
add("slab", blk(0, -40, 60, 2 * PX - 260, 190, 70).color('#ecebe4'));
const top = crop.value === 'young' ? 900 : crop.value === 'mid' ? 1500 : 2000;
const xs = [-480, -160, 160, 480];
xs.forEach((x, i) => {
  add(`cube-${i}`, blk(x, -40, 130, 100, 100, 70).color('#c9c08f'));
  // Twine reel on a hook over the wire, twine straight down to the cube.
  add(`hook-${i}`, rod([x, -40, WZ - 30], [x, -40, WZ - 90], 3).color(frame));
  add(`reel-${i}`, cylinder(40, 30, 12).rotateX(90).translate(x, -20, WZ - 125).color(twine));
  add(`reel-flange-${i}`, cylinder(6, 38, 12).rotateX(90).translate(x, -14, WZ - 125).color('#2f6b9a'));
  add(`twine-${i}`, cylZ(x, -40, 200, WZ - 355, 2.5, 5).color(twine));
  // Vine: zig-zag round the twine, leaves alternating, fruit trusses below.
  const steps = Math.round((top - 200) / 160);
  let prev: [number, number, number] = [x, -40, 200];
  for (let k = 1; k <= steps; k++) {
    const z = 200 + (k * (top - 200)) / steps;
    const off = k % 2 === 0 ? 22 : -22;
    const pt: [number, number, number] = [x + off, -40 + (k % 3 === 0 ? 14 : -14), z];
    add(`vine-${i}-${k}`, rod(prev, pt, 9, 6).color('#4d7d33'));
    prev = pt;
    const yaw = k * 137 + i * 40;
    const len = k === steps ? 160 : 260 - Math.abs(k - steps * 0.55) * 18;
    add(`leaf-${i}-${k}`, box(len, 110, 4, true).translate(len / 2, 0, 0).rotateY(-12).rotateZ(yaw).translate(pt[0], pt[1], pt[2]).color(foliage));
    if (k >= 2 && k <= steps - 2 && k % 2 === 0) {
      for (let f = 0; f < 2; f++) {
        const a = (yaw + 180 + f * 45) * Math.PI / 180;
        add(`fruit-${i}-${k}-${f}`, sphere(26).translate(pt[0] + Math.cos(a) * 60, pt[1] + Math.sin(a) * 60 - 20, pt[2] - 70 - f * 30).color(fruit));
      }
    }
  }
  add(`head-${i}`, sphere(40).translate(prev[0], prev[1], prev[2] + 30).color(foliage));
});

return p.model();
