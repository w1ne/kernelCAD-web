// SPDX-License-Identifier: CC0-1.0
// Checkout divider: the "next customer" bar laid on the till conveyor.
// What makes it a checkout divider rather than a block: a long triangular
// prism (so it never rolls on the belt) with a printed "next customer"
// message band on both sloped faces, moulded end caps that overhang the
// prism so it is easy to pick up, and a ribbed grip down the ridge. The
// round-bar variant is the older tubular style with flared end caps.
// Generic visualization geometry at about real size (400 mm long, 60 mm
// tall), millimetres, Z up, front toward -Y, lying on z = 0.

meta({
  name: "checkout-divider",
  license: 'CC0-1.0',
  title: "Checkout divider",
  description: "'Next customer' checkout divider bar at about real size: a 400 mm triangular prism that cannot roll on the belt, printed message bands with arrow chevrons on both sloped faces, overhanging moulded end caps and a ribbed ridge grip; round-bar variant with flared caps. Material controls: bar plastic, end caps, message band, lettering. supermarket, discount and organic presets; prism or round-bar profile.",
  tags: ['checkout divider', 'next customer bar', 'conveyor divider', 'till divider', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bar = param('bar', '#d8dcdc', { label: 'Bar plastic' });
const caps = param('caps', '#2a2d30', { label: 'End caps' });
const band = param('band', '#d23a2c', { label: 'Message band' });
const lettering = param('lettering', '#f4f2ea', { label: 'Lettering' });
const profile = param('profile', 'prism', { choices: ['prism', 'round'], label: 'Profile' });

presets({
  supermarket: { bar: '#d8dcdc', caps: '#2a2d30', band: '#d23a2c', lettering: '#f4f2ea' },
  discount: { bar: '#f2d23a', caps: '#1f3f8a', band: '#1f3f8a', lettering: '#f2d23a' },
  organic: { bar: '#c9b48a', caps: '#3f5a32', band: '#5c8a3e', lettering: '#f2eedc' },
});

const p = assembly("checkout-divider");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const L = 400;
const CAP = 22;
const BODY = L - 2 * CAP;

if (profile.value === 'prism') {
  // Triangle cross-section: 70 mm base, 60 mm tall, small flat ridge.
  const tri: number[][] = [[-35, 0], [35, 0], [5, 60], [-5, 60]];
  add("bar", profileYZ(tri, BODY).color(bar));
  // End caps: same triangle grown a few millimetres, slightly chamfered.
  const capTri: number[][] = [[-40, 0], [40, 0], [7, 66], [-7, 66]];
  for (const s of [-1, 1]) add(`cap-${s < 0 ? "l" : "r"}`, profileYZ(capTri, CAP).translate(s * (BODY + CAP) / 2, 0, 0).color(caps));
  // Ribbed grip along the ridge.
  for (let i = 0; i < 9; i++) add(`rib-${i}`, blk(-80 + i * 20, 0, 59, 6, 12, 3).color(caps));
  // Message band on each sloped face: a thin slab built upright, tipped
  // back onto the face (26.6 deg off vertical) and set on its toe edge.
  const lean = (Math.atan2(30, 60) * 180) / Math.PI;
  for (const s of [-1, 1]) {
    const face = (w: number, h: number, along: number, up: number, c, t = 1.5) =>
      blk(along, 0, up, w, t, h).rotateX(s < 0 ? -lean : lean).translate(0, s * 35.6, 0.5).color(c);
    add(`band-${s < 0 ? "f" : "b"}`, face(BODY - 30, 34, 0, 14, band));
    // "NEXT CUSTOMER" lettering blocks with a chevron at each end.
    const words = [34, 22, 30, 30, 26, 34, 30, 22, 28, 26];
    let x = -110;
    words.forEach((w, i) => {
      add(`letter-${s < 0 ? "f" : "b"}-${i}`, face(w * 0.55, 14, x, 24, lettering, 4));
      x += w * 0.55 + (i === 3 ? 22 : 6);
    });
    for (const e of [-1, 1]) {
      add(`chevron-${s < 0 ? "f" : "b"}-${e < 0 ? "l" : "r"}`, face(10, 22, e * 150, 20, lettering, 4));
    }
  }
} else {
  // Round tube with flared caps.
  add("bar", cylinder(BODY, 26, 16).rotateY(90).translate(-BODY / 2, 0, 34).color(bar));
  add("band", cylinder(BODY - 60, 27, 16).rotateY(90).translate(-(BODY - 60) / 2, 0, 34).color(band));
  for (let i = 0; i < 6; i++) add(`stripe-${i}`, cylinder(14, 27.5, 16).rotateY(90).translate(-110 + i * 40, 0, 34).color(lettering));
  for (const s of [-1, 1]) {
    const flare = path().moveTo(0, 0).lineTo(34, 0).lineTo(34, 6).lineTo(28, CAP).lineTo(0, CAP).close().revolve();
    add(`cap-${s < 0 ? "l" : "r"}`, flare.rotateY(s * 90).translate(s * BODY / 2, 0, 34).color(caps));
  }
}

return p.model();
