// Original kernelCAD low-poly vine arch: a rustic garden arch of two posts
// and a segmented round top, overgrown with clumps of climbing vine leaves
// and flowers. The walkway runs along Y; the arch spans X.

meta({
  name: 'vine-arch',
  license: 'CC0-1.0',
  title: 'Vine arch',
  description: 'Rustic garden arch overgrown with climbing vine clumps and flowers, a gateway for paths and gardens. Knobs: width, overgrowth, frame, leaf and flower colours.',
  tags: ['arch', 'garden arch', 'arbor', 'pergola', 'vine', 'ivy', 'roses', 'climbing plant', 'gateway', 'garden', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'park', 'meadow'],
  triangleBudget: 600,
});

const widthM = param('widthM', '1.4', { choices: ['1', '1.4', '2'], label: 'Width (m)' });
const growth = param('growth', 'medium', { choices: ['light', 'medium', 'heavy'], label: 'Overgrowth' });
const frame = param('frame', '#7a5a3e', { label: 'Frame' });
const leaves = param('leaves', '#3f7f3a', { label: 'Vine leaves' });
const flowers = param('flowers', '#d8507a', { label: 'Flowers' });

presets({
  white: { frame: '#e8e6e0' },
  wisteria: { flowers: '#9a7ad8' },
  ivy: { leaves: '#2f5f2e', flowers: '#3f7f3a' },
});

const W = Number(widthM.value) * 1000;
const g = growth.value === 'light' ? 0 : growth.value === 'medium' ? 1 : 2;
const postH = 1500;
const D = 300; // depth of the arch along Y
const post = 80;
const R = W / 2;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Arch band: a semicircular strip (outer radius R + post/2, inner R - post/2)
// as a faceted polygon in XZ, extruded along Y.
const band = (y0: number, t: number) => {
  const pts: [number, number][] = [];
  const n = 6;
  for (let k = 0; k <= n; k++) {
    const a = (Math.PI * k) / n;
    pts.push([(R + post / 2) * Math.cos(a), postH - 20 + (R + post / 2) * Math.sin(a)]);
  }
  for (let k = n; k >= 0; k--) {
    const a = (Math.PI * k) / n;
    pts.push([(R - post / 2) * Math.cos(a), postH - 20 + (R - post / 2) * Math.sin(a)]);
  }
  return extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
};

const a = assembly('vine-arch');
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    a.part(`post-${sx < 0 ? 'l' : 'r'}-${sy < 0 ? 'f' : 'b'}`, box(post, post * 0.8, postH).translate(sx * R - post / 2, sy * D / 2 - post * 0.4, 0).color(frame));
  }
}
a.part('arch-front', band(-D / 2 - post * 0.4, post * 0.8).color(frame));
a.part('arch-back', band(D / 2 - post * 0.4, post * 0.8).color(frame));
// Cross slats over the top, joining front and back bands.
for (let k = 1; k < 6; k++) {
  const ang = (Math.PI * k) / 6;
  const x = R * Math.cos(ang);
  const z = postH - 20 + R * Math.sin(ang);
  a.part(`slat-${k}`, box(40, D + post * 0.8, 30, true).rotateY(-(ang * 180) / Math.PI + 90).translate(x, 0, z).color(frame));
}

// Vine clumps: faceted lumps climbing both posts and over the top.
const lump = (x: number, y: number, z: number, r: number, rot: number) =>
  ngon(r * 0.6, 5, rot).loft([ngon(r, 5, rot + 0.6), ngon(r * 0.4, 5, rot)], {
    planes: [
      { plane: 'XY', origin: [x, y, z - r * 0.6] },
      { plane: 'XY', origin: [x, y, z] },
      { plane: 'XY', origin: [x, y, z + r * 0.7] },
    ],
    ruled: true,
  });
const spots: [number, number, number, number][] = [];
const climb = [0.15, 0.45, 0.75];
for (const sx of [-1, 1]) {
  climb.slice(0, 1 + g).forEach((t, i) => spots.push([sx * R, ((i % 2) - 0.5) * D * 0.6, postH * t, 170]));
}
const overTop = g === 0 ? [0.5] : g === 1 ? [0.25, 0.6, 0.85] : [0.12, 0.35, 0.55, 0.75, 0.92];
overTop.forEach((t, i) => {
  const ang = Math.PI * t;
  spots.push([R * Math.cos(ang), ((i % 2) - 0.5) * D * 0.4, postH - 20 + R * Math.sin(ang) + 30, 200]);
});
spots.forEach(([x, y, z, r], i) => {
  a.part(`vine-${i + 1}`, lump(x, y, z, r, i).color(leaves));
  if (i % 2 === 0) {
    a.part(`flower-${i + 1}`, ngon(45, 5, i).loft(ngon(20, 5, i + 0.6), { spacing: 40, ruled: true }).translate(x + r * 0.55, y - r * 0.55, z + r * 0.1).color(flowers));
  }
});

return a.model();
