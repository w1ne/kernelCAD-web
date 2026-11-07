// SPDX-License-Identifier: CC0-1.0
// Field documentation camera, the interchangeable-lens body used to shoot
// sections, plans and finds in situ. What makes it one: a rangefinder-style
// body with a silver top plate and a central viewfinder hump; a deep rubber
// grip with the shutter button on top; a zoom lens with ribbed focus and zoom
// rings, an aperture ring and a coated front element; mode and command dials, a hot shoe,
// a rear screen and eyecup, and a woven strap lying behind it on the table.
// Millimetres, Z up, camera base on z = 0, lens pointing along -Y.
meta({
  name: "site-camera",
  license: 'CC0-1.0',
  title: "Field documentation camera",
  description: "Interchangeable-lens field camera at real size: polymer body with a silver top plate and central viewfinder hump, leatherette band, deep rubber grip with shutter button, zoom lens with ribbed zoom and focus rings, aperture ring, front bezel and coated front element, mode and command dials, hot shoe, rear screen, eyecup and buttons, strap lugs and a woven strap lying behind. Material controls: molded polymer, top-plate metal, glass, rubber; fieldReady, weathered and fieldOrange presets.",
  tags: ["archaeology", "excavation", "fieldwork", "camera", "photography", "documentation", "mirrorless", "CC0"],
  kit: 'archaeology-fieldwork',
  category: 'prop',
  origin: 'base',
  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', '#30353a', { label: 'Molded polymer' });
const metal = param('metal', '#c3c8cb', { label: 'Top-plate metal' });
const glass = param('glass', '#3f7c95', { label: 'Glass' });
const rubber = param('rubber', '#1d2022', { label: 'Rubber' });
presets({
  fieldReady: { polymer: '#3a4045', metal: '#d4d8da', glass: '#5d97ad', rubber: '#26292b' },
  weathered: { polymer: '#4a4f50', metal: '#8f9392', glass: '#4b6d78', rubber: '#2f3131' },
  fieldOrange: { polymer: '#e2732a', metal: '#2c3033', glass: '#3f7c95', rubber: '#24282a' },
});

const p = assembly("site-camera");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Lathe along X / Y: [[radius, x or y], ...] rising, centred on the other two axes.
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
const outline = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close();
};
// Closed (x, z) profile extruded along Y from y0 to y1.
const sideY = (pts, y0, y1) => outline(pts).extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const strap = '#9a3b2c', lcd = '#22343c', white = '#e9ecea';
const LX = -12, LZ = 38; // lens axis

// ---- Body ----
add('body-lower', sideY([[-62, 0], [62, 0], [67, 5], [67, 58], [-67, 58], [-67, 5]], -21, 21).color(polymer));
add('top-plate', sideY([[-67, 58], [67, 58], [67, 74], [62, 79], [24, 79], [17, 97], [-17, 97], [-24, 79], [-62, 79], [-67, 74]], -22, 22).color(metal));
add('leatherette', blk(-64, -22.5, 6, 40, -21, 56).color(rubber));
add('grip', sideY([[40, 2], [64, 2], [70, 10], [72, 40], [70, 70], [62, 76], [44, 76], [38, 60], [38, 10]], -42, -21).color(rubber));
add('viewfinder-window', blk(-10, -22.5, 82, 10, -21.5, 91).color(glass));
add('hot-shoe', blk(-13, -12, 97, 13, 12, 101).color(metal));
add('shutter-button', lathe([[9, 76], [9, 81], [7, 84]], 10).translate(56, -30, 0).color(metal));
add('shutter-collar', lathe([[13, 76], [13, 79]], 12).translate(56, -30, 0).color(polymer));
add('mode-dial', lathe([[15, 79], [16, 81], [16, 89], [14, 91]], 16).translate(42, 6, 0).color(metal));
add('mode-dial-mark', blk(40, -10, 89, 44, -4, 91.5).color(white));
add('command-dial', lathe([[13, 79], [13, 87]], 16).translate(-44, 4, 0).color(metal));
add('front-dial', latheX([[9, 64], [9, 70]], -16, 66, 12).color(polymer));
add('lens-release', latheY([[6, -24], [6, -21]], 30, 36, 8).color(metal));
for (const s of [-1, 1]) {
  add(`strap-lug-${s}`, blk(s * 67 - 3, -5, 64, s * 67 + 3 + s * 3, 5, 72).color(metal));
}
// Rear: screen, eyecup and buttons.
add('rear-screen-frame', blk(-60, 21, 8, 30, 23, 56).color(rubber));
add('rear-screen', blk(-56, 23, 12, 26, 23.8, 52).color(lcd));
add('eyecup', blk(-16, 22, 80, 16, 32, 96).color(rubber));
add('eyepiece', blk(-10, 32, 84, 10, 32.6, 92).color(glass));
for (let i = 0; i < 4; i++) {
  add(`rear-button-${i}`, lathe([[5, 0], [5, 2.5]], 8).rotateX(-90).translate(48, 21, 52 - i * 12).color(polymer));
}
add('rear-pad', lathe([[11, 0], [11, 2.5]], 12).rotateX(-90).translate(50, 21, 16).color(metal));

// ---- Lens ----
add('lens-mount', latheY([[31, -26], [31, -21]], LX, LZ, 18).color(metal));
add('lens-base', latheY([[29, -42], [29, -26]], LX, LZ, 18).color(polymer));
add('aperture-ring', latheY([[31, -50], [31, -42]], LX, LZ, 18).color(metal));
add('zoom-ring', latheY([[32, -74], [32, -52]], LX, LZ, 18).color(rubber));
for (let i = 0; i < 5; i++) {
  add(`zoom-rib-${i}`, latheY([[33.5, -72 + i * 4], [33.5, -70 + i * 4]], LX, LZ, 18).color(rubber));
}
add('lens-barrel', latheY([[30, -90], [30, -74]], LX, LZ, 18).color(polymer));
add('focus-ring', latheY([[31.5, -102], [31.5, -90]], LX, LZ, 18).color(rubber));
add('lens-front', latheY([[33, -110], [33, -102]], LX, LZ, 18).color(polymer));
add('lens-name-ring', latheY([[33.2, -104], [33.2, -103]], LX, LZ, 18).color(white));
add('front-bezel', latheY([[28, -111], [28, -110]], LX, LZ, 18).color(rubber));
add('front-element', latheY([[23, -112], [23, -111]], LX, LZ, 18).color(glass));
add('front-element-centre', latheY([[11, -112.5], [11, -112]], LX, LZ, 14).color('#6fb0c4'));

// ---- Woven strap lying behind the camera ----
for (const s of [-1, 1]) {
  const pts = [[s * 72, 0, 68], [s * 82, 22, 40], [s * 88, 55, 8], [s * 78, 100, 6], [s * 45, 135, 6], [0, 148, 6]];
  for (let i = 0; i < pts.length - 1; i++) add(`strap-${s}-${i}`, tube(pts[i], pts[i + 1], 5, 6).color(strap));
}
add('strap-keeper', blk(-45, 130, 0, -28, 142, 7).color(rubber));

return p.model();
