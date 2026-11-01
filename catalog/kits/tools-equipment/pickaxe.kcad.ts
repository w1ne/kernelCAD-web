// Original kernelCAD low-poly pickaxe lying on its side as a pickup item: a
// curved steel head with sharpened points (or a prospector's pick with a
// hammer poll) on a hexagonal wooden haft. Millimetres, Z up, base on z = 0
// centred on x = y = 0, haft along X with the head at +X.

meta({
  name: 'pickaxe',
  license: 'CC0-1.0',
  title: 'Pickaxe',
  description: 'Pickaxe lying flat as a pickup or mining prop, with a curved double-pointed steel head or a prospector pick and hammer poll on a wooden haft. Knobs: style, haft length, head, tip and haft colours.',
  tags: ['pickaxe', 'pick', 'mattock', 'mining', 'miner', 'dig', 'tool', 'item', 'pickup', 'fantasy'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'mine', 'cave', 'construction', 'medieval', 'fantasy'],
  triangleBudget: 160,
});

const style = param('style', 'double', { choices: ['double', 'prospector'], label: 'Style' });
const length = param('length', 'long', { choices: ['short', 'long'], label: 'Haft length' });
const head = param('head', '#55595f', { label: 'Head' });
const tips = param('tips', '#c4c9cf', { label: 'Sharpened tips' });
const haft = param('haft', '#a8743f', { label: 'Haft' });

presets({
  rusty: { head: '#6a4a36', tips: '#9a7a62' },
  diamond: { head: '#3a8fa0', tips: '#a8f0ff', haft: '#6a4a2a' },
});

const L = length.value === 'short' ? 420 : 900;
const hs = length.value === 'short' ? 0.6 : 1; // head scale
const T = 36 * hs; // head thickness (Z)
const zc = T / 2;
const hx = L / 2 - 40 * hs;
const H = (pts: [number, number][]) => pts.map(([x, y]) => [hx + x * hs, y * hs] as [number, number]);

const p = assembly('pickaxe');
// Haft: hexagonal rod along X, ending just past the head.
const r = zc;
let hex = path().moveTo(r, 0);
for (let k = 1; k < 6; k++) hex = hex.lineTo(r * Math.cos((Math.PI * k) / 3), r * Math.sin((Math.PI * k) / 3));
p.part('haft', hex.close().extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(haft));

// Head: arms sweep back toward the haft from a boxed eye.
const pick = style.value === 'double';
const arm: [number, number][] = pick
  ? [[-95, -280], [-35, -160], [-8, -60], [30, -30], [30, 30], [-8, 60], [-35, 160], [-95, 280], [-55, 150], [-30, 40], [-30, -40], [-55, -150]]
  : [[-70, -200], [-25, -110], [-6, -50], [30, -30], [30, 34], [-30, 34], [-30, -40], [-42, -110]];
let h = extrudePolygon(H(arm), T).union(box(70 * hs, 76 * hs, T, true).translate(hx, 0, zc));
if (!pick) {
  // Square hammer poll on the +Y side.
  h = h.union(box(48 * hs, 110 * hs, T, true).translate(hx, 70 * hs, zc));
}
p.part('head', h.color(head));
// Sharpened steel points over the arm tips.
const tip = (pts: [number, number][]) => extrudePolygon(H(pts), T + 2);
if (pick) {
  p.part('tip-front', tip([[-98, -285], [-51, -201], [-75, -197]]).color(tips));
  p.part('tip-back', tip([[-75, 197], [-51, 201], [-98, 285]]).color(tips));
} else {
  p.part('tip-front', tip([[-72, -204], [-38, -141], [-53, -138]]).color(tips));
}

return p.model();
