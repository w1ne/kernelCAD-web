// Low-poly desktop keyboard with a sloped ABS shell, individually separated
// PBT keycaps, printed legends, accent keys, and optional navigation cluster
// and number pad. The key pitch and shallow rear riser make it read as a
// desktop keyboard rather than a row of colored strips. Millimetres, Z up,
// base on z = 0 centred on x = y = 0. The typing edge faces -Y.

meta({
  name: 'keyboard',
  license: 'CC0-1.0',
  title: 'Keyboard',
  description: 'Desktop computer keyboard with a sloped ABS shell, separated PBT keycaps, printed legends, accent keys, and optional navigation cluster and number pad. Knobs: layout, caseABS, keycapPBT, accentPBT and legendInk; retro, white and gamer presets.',
  tags: ['keyboard', 'computer keyboard', 'keys', 'typing', 'computer', 'pc', 'peripheral', 'desk'],
  kit: 'electronics',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'office', 'desk', 'bedroom', 'study'],
  triangleBudget: 2000,
});

const layout = param('layout', 'tenkeyless', { choices: ['compact', 'tenkeyless', 'full'], label: 'Layout' });
const caseABS = param('caseABS', '#1f2023', { label: 'ABS case' });
const keycapPBT = param('keycapPBT', '#5d616a', { label: 'PBT keycaps' });
const accentPBT = param('accentPBT', '#d0533e', { label: 'Accent PBT keycaps' });
const legendInk = param('legendInk', '#d9d7ce', { label: 'Printed legend ink' });

presets({
  retro: { caseABS: '#9e8766', keycapPBT: '#f1e4c5', accentPBT: '#c66b3c', legendInk: '#514536' },
  white: { caseABS: '#bfc5c7', keycapPBT: '#eff1ef', accentPBT: '#6d94bf', legendInk: '#535e67' },
  gamer: { caseABS: '#141416', keycapPBT: '#26272b', accentPBT: '#38e07b', legendInk: '#b7ffc9' },
});

const u = 19.05; // key pitch
const g = 4; // gap between keys
const hasFn = layout.value !== 'compact';
const hasNav = layout.value !== 'compact';
const hasPad = layout.value === 'full';
const rows = hasFn ? 6.5 : 5;
const kw = 15 * u + (hasNav ? 3.25 * u : 0) + (hasPad ? 4.25 * u : 0);
const m = 13;
const W = kw + 2 * m;
const D = rows * u + 2 * m;
const x0 = -kw / 2;
const y0 = -D / 2 + m;
// Case top slopes up toward the back; keys step with it.
const zf = 17;
const zb = 27;
const topAt = (y: number) => zf + ((y + D / 2) * (zb - zf)) / D;

const k = assembly('keyboard');
k.part('case', extrudePolygon([[-D / 2, 0], [D / 2, 0], [D / 2, zb], [-D / 2 + 6, zf], [-D / 2, zf - 5]], W)
  .rotateX(90).rotateZ(90).translate(-W / 2, 0, 0).color(caseABS));

// Key span starts at column `c` and row `r` (row 0 faces the typist).
// Long spans become separate keycaps; `merged` is reserved for the space bar.
type KeyMaterial = 'keycap' | 'accent';
const KEYCAP: KeyMaterial = 'keycap';
const ACCENT: KeyMaterial = 'accent';
const put = (c: number, r: number, n: number, material: KeyMaterial, depth = 1, merged = false) => {
  const ya = y0 + (r >= 5 ? r + 0.5 : r) * u + g / 2;
  const yb = ya + depth * u - g;
  const z = topAt(yb);
  const count = merged ? 1 : Math.max(1, Math.round(n));
  const pitch = (n * u) / count;
  const capW = pitch - g;
  for (let j = 0; j < count; j++) {
    const x = x0 + c * u + j * pitch + (pitch - capW) / 2;
    const keyIndex = i++;
    const cap = box(capW, yb - ya, 9).translate(x, ya, z - 3);
    k.part(`keycap-${keyIndex}`, material === 'accent' ? cap.color(accentPBT) : cap.color(keycapPBT));

    // Small printed dashes keep selected key tops readable in the low-poly preview.
    if (!merged && keyIndex % 5 === 1) {
      const markW = Math.min(5, capW * 0.38);
      k.part(`legend-${keyIndex}`, box(markW, 1.25, 0.8)
        .translate(x + (capW - markW) / 2, ya + (yb - ya) * 0.62, z + 6.1)
        .color(legendInk));
    }
  }
};
let i = 0;
// Main block, 15 units wide.
put(0, 0, 3.75, KEYCAP); put(3.75, 0, 6.25, ACCENT, 1, true); put(10, 0, 5, KEYCAP);
put(0, 1, 2.25, KEYCAP); put(2.25, 1, 10, KEYCAP); put(12.25, 1, 2.75, KEYCAP);
put(0, 2, 1.75, KEYCAP); put(1.75, 2, 11, KEYCAP); put(12.75, 2, 2.25, ACCENT);
put(0, 3, 1.5, KEYCAP); put(1.5, 3, 13.5, KEYCAP);
put(0, 4, 13, KEYCAP); put(13, 4, 2, KEYCAP);
if (hasFn) {
  put(0, 5, 1, ACCENT); put(2, 5, 4, KEYCAP); put(6.5, 5, 4, KEYCAP); put(11, 5, 4, KEYCAP);
}
if (hasNav) {
  const c = 15.25;
  put(c, 5, 1, KEYCAP); put(c + 1, 5, 1, KEYCAP); put(c + 2, 5, 1, KEYCAP);
  put(c, 3, 1, KEYCAP); put(c + 1, 4, 1, ACCENT); put(c + 1, 3, 1, ACCENT); put(c + 2, 3, 1, KEYCAP);
  put(c, 1, 1, KEYCAP); put(c, 0, 1, KEYCAP);
}
if (hasPad) {
  const c = 18.5;
  for (const r of [2, 3, 4]) for (let col = 0; col < 3; col++) put(c + col, r, 1, KEYCAP);
  put(c, 1, 2, KEYCAP, 1, true); put(c + 2, 1, 1, KEYCAP);
  put(c + 3, 2, 1, ACCENT, 2); put(c + 3, 0, 1, ACCENT, 2);
}

return k.model();
