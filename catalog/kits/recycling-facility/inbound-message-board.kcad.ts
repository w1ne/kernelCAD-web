// SPDX-License-Identifier: CC0-1.0
// Inbound message board: the variable message sign at a recycling site
// entrance that tells arriving vehicles where to go or whether the site is
// full. What makes it a message board rather than a fixed sign: a deep
// weatherproof housing with a sun hood over a black LED face, the message
// written in lit dot-matrix pixels, a solar panel and modem antenna on top,
// and a control cabinet at the foot of the twin posts. A fixed site name
// panel hangs under the display.
// Generic visualization geometry at about real size (4.9 m wide, 5.3 m
// high), millimetres, Z up, display face toward -Y.

meta({
  name: "inbound-message-board",
  license: 'CC0-1.0',
  title: "Inbound message board",
  description: "Site-entrance variable message sign at about real size: twin galvanised posts on concrete plinths, deep housing with sun hood over a black dot-matrix LED face showing WEIGH IN, SITE FULL or OPEN, solar panel, modem antenna, control cabinet and a fixed site-name panel. Material controls: housing, LED pixels, posts and site panel; message choice. amber, councilGreen, alertRed and weathered presets.",
  tags: ['message board', 'variable message sign', 'VMS', 'LED sign', 'dot matrix', 'entrance sign', 'traffic sign', 'weighbridge', 'reception', 'recycling', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#3a3f44', { label: 'Sign housing and hood (powder coat)' });
const led = param('led', '#ffb020', { label: 'LED pixels' });
const posts = param('posts', '#a4acb0', { label: 'Posts and cabinet (galvanised steel)' });
const panel = param('panel', '#2f7a46', { label: 'Site-name panel' });
const message = param('message', 'weighIn', { choices: ['weighIn', 'siteFull', 'open'], label: 'Message shown' });

presets({
  amber: { housing: '#3a3f44', led: '#ffb020', posts: '#a4acb0', panel: '#2f7a46' },
  councilGreen: { housing: '#2c4a36', led: '#7dff6a', posts: '#3a3f44', panel: '#2f7a46' },
  alertRed: { housing: '#3a3f44', led: '#ff4a3a', posts: '#a4acb0', panel: '#2f5fa8' },
  weathered: { housing: '#565a5c', led: '#d9a040', posts: '#7d7b72', panel: '#4d6a52' },
});

const p = assembly("inbound-message-board");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).translate(x, y, z);

const SW = 4900, SD = 380, SH = 1300, ZS = 3300, PX = 1500;

// Concrete plinths and twin galvanised posts.
for (const s of [-1, 1]) {
  add(`plinth-${s}`, blk(s * PX, 0, 0, 700, 700, 300).color('#b7b2a6'));
  add(`base-plate-${s}`, blk(s * PX, 0, 300, 420, 420, 25).color(posts));
  add(`post-${s}`, cylZ(s * PX, 0, 325, ZS + SH - 400, 110).color(posts));
}

// Housing with recessed black LED face, sun hood and side cheeks.
add("housing", blk(0, 0, ZS, SW, SD, SH).subtract(blk(0, -SD / 2, ZS + 120, SW - 240, 80, SH - 240)).color(housing));
add("led-face", blk(0, -SD / 2 + 40, ZS + 120, SW - 240, 10, SH - 240).color('#141618'));
add("hood", box(SW + 100, 420, 30, true).rotateX(-12).translate(0, -SD / 2 - 160, ZS + SH + 20).color(housing));
for (const s of [-1, 1]) add(`cheek-${s}`, blk(s * (SW / 2 + 30), -SD / 2 - 150, ZS + SH - 300, 30, 340, 340).color(housing));
add("back-door", blk(0, SD / 2 + 5, ZS + 150, SW - 600, 10, SH - 300).color('#4a5056'));
add("bracket", blk(0, SD / 2 + 60, ZS + 300, 2 * PX + 260, 100, 120).color(posts));

// Dot-matrix message, 5 x 7 font, lit pixels merged into horizontal runs.
const FONT: Record<string, string[]> = {
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
const text = message.value === 'siteFull' ? 'SITE FULL' : message.value === 'open' ? 'OPEN >' : 'WEIGH IN >';
const PP = 74, PS = 54, ZT = ZS + SH / 2 + 3.5 * PP;
const x0 = -((text.length * 6 - 1) * PP) / 2;
for (let ci = 0; ci < text.length; ci++) {
  const glyph = FONT[text[ci]];
  for (let r = 0; r < 7; r++) {
    const row = glyph[r];
    let c = 0;
    while (c < 5) {
      if (row[c] !== '1') { c++; continue; }
      let e = c;
      while (e < 5 && row[e] === '1') e++;
      const xa = x0 + (ci * 6 + c) * PP, xb = x0 + (ci * 6 + e - 1) * PP;
      add(`px-${ci}-${r}-${c}`, blk((xa + xb) / 2 + PP / 2, -SD / 2 + 30, ZT - (r + 1) * PP + (PP - PS) / 2, xb - xa + PS, 12, PS).color(led));
      c = e;
    }
  }
}

// Solar panel facing the approach road, and the modem antenna.
add("solar-mast", cylZ(-SW / 2 + 700, 0, ZS + SH, 450, 40, 8).color(posts));
add("solar-panel", box(1200, 800, 40, true).rotateX(30).translate(-SW / 2 + 700, 0, ZS + SH + 520).color('#1f3550'));
add("solar-frame", box(1240, 840, 30, true).rotateX(30).translate(-SW / 2 + 700, 12, ZS + SH + 500).color('#c3c8cb'));
add("antenna", cylZ(SW / 2 - 300, 0, ZS + SH, 600, 15, 6).color('#1d2224'));
add("antenna-tip", cylZ(SW / 2 - 300, 0, ZS + SH + 600, 60, 30, 8).color('#1d2224'));

// Fixed site-name panel under the display.
add("site-panel", blk(0, -140, ZS - 900, 2 * PX + 400, 40, 700).color(panel));
add("site-panel-border", blk(0, -162, ZS - 860, 2 * PX + 320, 4, 620).subtract(blk(0, -162, ZS - 830, 2 * PX + 260, 20, 560)).color('#f4f1e8'));
add("site-panel-icon", cylinder(6, 220, 16).rotateX(90).translate(-PX + 120, -164, ZS - 550).subtract(cylinder(20, 130, 16).rotateX(90).translate(-PX + 120, -160, ZS - 550)).color('#f4f1e8'));
for (let i = 0; i < 2; i++) add(`site-text-${i}`, blk(250, -166, ZS - 480 - i * 220, 2000 - i * 500, 6, 120).color('#f4f1e8'));

// Control cabinet on the left post, with conduit up to the housing.
add("cabinet", blk(-PX - 360, -60, 900, 500, 350, 800).color(posts));
add("cabinet-door", blk(-PX - 360, -240, 940, 440, 10, 720).color('#8e9599'));
add("cabinet-lock", blk(-PX - 180, -250, 1250, 30, 12, 80).color('#1d2224'));
add("cabinet-vent", blk(-PX - 360, -248, 1500, 300, 6, 60).color('#5a6266'));
add("cabinet-roof", blk(-PX - 360, -60, 1700, 560, 410, 40).color(posts));
add("conduit", cylZ(-PX - 180, 100, 1740, ZS - 1740, 30, 8).color('#5a6266'));

return p.model();
