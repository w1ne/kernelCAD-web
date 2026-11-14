// SPDX-License-Identifier: CC0-1.0
// Entry security gate: the anti-theft (EAS) antenna pedestal that stands
// either side of a shop doorway and alarms on unpaid tags. What makes it
// an EAS gate rather than a sign: a tall rounded-rectangle frame around a
// clear acrylic panel, with the copper antenna loop visible inside, a
// status LED strip along the top, a brand badge at hand height, a
// sloped foot with a speaker grille, and (as a pair) a floor cable cover
// running across the aisle between the two pedestals. Generic
// visualization geometry at about real size (0.5 m wide, 1.76 m tall
// each; pair 1.5 m across), millimetres, Z up, shoppers walk along Y.

meta({
  name: "entry-security-gate",
  license: 'CC0-1.0',
  title: "Entry security gate",
  description: "Retail EAS anti-theft antenna pedestal at about real size: rounded frame around a clear acrylic panel with the antenna loop inside, top LED status strip, brand badge, sloped foot with speaker grille; single or as a pair with a floor cable cover. Material controls: frame, acrylic, status LED, foot shell. modernStore, fashionBoutique and discounter presets; layout choice.",
  tags: ['security gate', 'EAS', 'anti-theft', 'antenna pedestal', 'entrance', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#d9dcdd', { label: 'Pedestal frame' });
const acrylic = param('acrylic', '#b6dce4', { label: 'Clear acrylic panel' });
const led = param('led', '#3fd07a', { label: 'Status LED strip' });
const shell = param('shell', '#3a4045', { label: 'Foot shell and badge' });
const layout = param('layout', 'pair', { choices: ['pair', 'single'], label: 'Layout' });

presets({
  modernStore: { frame: '#d9dcdd', acrylic: '#b6dce4', led: '#3fd07a', shell: '#3a4045' },
  fashionBoutique: { frame: '#1f2326', acrylic: '#cfd8dc', led: '#f2f2f2', shell: '#b8975a' },
  discounter: { frame: '#e3ad2b', acrylic: '#a8d4dc', led: '#e8473a', shell: '#2b2f33' },
});

const p = assembly("entry-security-gate");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const roundRect = (w: number, h: number, r: number, n = 5) => {
  const pts = [];
  const corners = [[w / 2 - r, h - r, 0], [-w / 2 + r, h - r, 90], [-w / 2 + r, r, 180], [w / 2 - r, r, 270]];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  }
  return pts;
};

const W = 460;
const H = 1650;
const FOOT = 100;

// One pedestal: built in XZ with its front on -Y, then turned so the panel
// faces across the aisle (front on -X) and shoppers pass along Y.
const pedestal = (k: string, x: number) => {
  const at = (s: Shape) => s.rotateZ(-90).translate(x, 0, 0);
  // Sloped foot with speaker grille.
  add(`foot-${k}`, at(profileXZ([[-280, 0], [280, 0], [230, FOOT], [-230, FOOT]], 240)).color(shell));
  for (let i = 0; i < 5; i++) add(`grille-${k}-${i}`, at(blk(-60 + i * 30, -122, 30, 14, 6, 44)).color('#1c1f22'));
  // Frame ring, acrylic panel and the antenna loop inside.
  add(`frame-${k}`, at(profileXZ(roundRect(W, H, 130), 56).subtract(profileXZ(roundRect(W - 110, H - 110, 80), 70).translate(0, 0, 55)).translate(0, 0, FOOT)).color(frame));
  add(`acrylic-${k}`, at(profileXZ(roundRect(W - 100, H - 100, 84), 12).translate(0, 0, FOOT + 50)).color(acrylic));
  for (const [s, y] of [['a', -8], ['b', 8]]) {
    add(`antenna-${k}-${s}`, at(profileXZ(roundRect(W - 180, H - 180, 50), 3).subtract(profileXZ(roundRect(W - 196, H - 196, 42), 6).translate(0, 0, 8)).translate(0, y, FOOT + 90)).color('#b87333'));
  }
  // Top LED strip and brand badge.
  add(`led-${k}`, at(blk(0, 0, FOOT + H - 8, 170, 36, 14)).color(led));
  add(`badge-${k}`, at(profileXZ(roundRect(220, 90, 30, 3), 8).translate(0, -12, FOOT + 980)).color(shell));
  add(`badge-text-${k}`, at(blk(0, -18, FOOT + 1015, 150, 4, 20)).color(frame));
  add(`badge-dot-${k}`, at(cylinder(6, 12, 10).rotateX(90).translate(80, -16, FOOT + 1045)).color(led));
};

if (layout.value === 'pair') {
  pedestal('l', -750);
  pedestal('r', 750);
  // Floor cable cover across the aisle between the pedestals.
  add("cable-cover", profileYZ([[-70, 0], [70, 0], [36, 18], [-36, 18]], 1260).color(shell));
  add("cable-cover-stripe-l", blk(-300, 0, 18, 200, 20, 3).color(led));
  add("cable-cover-stripe-r", blk(300, 0, 18, 200, 20, 3).color(led));
} else {
  pedestal('s', 0);
}

return p.model();
