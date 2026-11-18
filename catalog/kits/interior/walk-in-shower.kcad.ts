// Original kernelCAD low-poly walk-in shower: a low tray, two tiled walls, a
// framed glass screen, a riser rail with a rain head, a mixer and a soap
// niche shelf. Glass is a pale tint on the single palette material.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Open toward -Y;
// the tiled walls are at +Y and +X.

meta({
  name: 'walk-in-shower',
  license: 'CC0-1.0',
  title: 'Walk-in shower',
  description: 'Walk-in shower with a tray, two tiled walls, a framed glass screen, rain shower head, mixer and corner shelf. Knobs: tray length, screen, tray, tile, glass and metal colours.',
  tags: ['shower', 'walk-in shower', 'shower enclosure', 'shower screen', 'cubicle', 'bathroom', 'wet room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bathroom'],
  triangleBudget: 300,
});

const length = param('length', '1200', { choices: ['900', '1200', '1400'], label: 'Tray length (mm)' });
const screen = param('screen', 'yes', { choices: ['yes', 'no'], label: 'Glass screen' });
const tray = param('tray', '#f2f1ec', { label: 'Tray' });
const tile = param('tile', '#9cb8c4', { label: 'Wall tiles' });
const glass = param('glass', '#cfe2e8', { label: 'Glass' });
const metal = param('metal', '#a9adb0', { label: 'Frame and fittings' });

presets({
  slate: { tile: '#4a4f55', tray: '#2b2d30', metal: '#2b2927' },
  sand: { tile: '#d9cfbd', metal: '#b8913f' },
});

const L = Number(length.value);
const Dp = 900;
const H = 2000;
const th = 60;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const s = assembly('walk-in-shower');
const x0 = -L / 2;
const x1 = L / 2;
const y0 = -Dp / 2;
const y1 = Dp / 2;
s.part('tray', blk(x0, y0, 0, x1, y1, th).subtract(blk(x0 + 30, y0 + 30, th - 15, x1 - 90, y1 - 90, th + 10)).color(tray));
s.part('waste', blk(x0 + 80, -20, th - 16, x1 - 140, 20, th - 12).color(metal));
s.part('wall-back', blk(x0, y1 - 60, 0, x1, y1, H + 100).color(tile));
s.part('wall-side', blk(x1 - 60, y0, 0, x1, y1 - 59, H + 100).color(tile));
if (screen.value === 'yes') {
  // Fixed screen on the -X side running from the back wall to 2/3 depth.
  const sy = y0 + Dp * 0.3;
  s.part('screen-glass', blk(x0 + 10, sy, th - 1, x0 + 22, y1 - 59, H).color(glass));
  s.part('screen-profile', blk(x0, sy - 10, th - 1, x0 + 32, sy + 10, H + 10).color(metal));
  s.part('screen-top', blk(x0, sy - 10, H - 10, x0 + 32, y1 - 59, H + 10).color(metal));
}
// Riser rail, overhead arm with rain head, mixer, corner shelf.
const rx = 0;
s.part('riser', blk(rx - 15, y1 - 95, 950, rx + 15, y1 - 59, H - 40).color(metal));
s.part('arm', blk(rx - 12, y1 - 400, H - 80, rx + 12, y1 - 80, H - 56).color(metal));
s.part('rain-head', ngon(140, 10).extrude(14).translate(rx, y1 - 340, H - 110).color(metal));
s.part('mixer', blk(rx - 90, y1 - 105, 1000, rx + 90, y1 - 59, 1070).color(metal));
s.part('hand-shower', blk(rx - 20, y1 - 130, 1250, rx + 20, y1 - 94, 1500).color(metal));
s.part('shelf', extrudePolygon([[x1 - 61, y1 - 61], [x1 - 61, y1 - 260], [x1 - 260, y1 - 61]], 20).translate(0, 0, 1300).color(tray));

return s.model();
