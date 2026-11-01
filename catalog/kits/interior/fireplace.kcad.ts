// Original kernelCAD low-poly fireplace: a chimney breast with a mantel
// shelf, a surround framing a dark firebox, a stone hearth, stacked logs and
// optional low-poly flames. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0. Front faces -Y; the back stands against a wall at +Y.

meta({
  name: 'fireplace',
  license: 'CC0-1.0',
  title: 'Fireplace',
  description: 'Fireplace with a mantel shelf, surround, dark firebox, stone hearth, stacked logs and optional flames. Knobs: style, fire, surround, hearth, firebox, log and flame colours.',
  tags: ['fireplace', 'hearth', 'mantel', 'chimney', 'fire', 'logs', 'living room', 'cozy'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'cabin', 'tavern'],
  triangleBudget: 400,
});

const style = param('style', 'mantel', { choices: ['mantel', 'stone'], label: 'Style' });
const fire = param('fire', 'lit', { choices: ['lit', 'unlit'], label: 'Fire' });
const surround = param('surround', '#efede7', { label: 'Surround' });
const hearth = param('hearth', '#6d6f72', { label: 'Hearth' });
const firebox = param('firebox', '#231f1d', { label: 'Firebox' });
const logs = param('logs', '#6b4a2f', { label: 'Logs' });
const flame = param('flame', '#f29a2e', { label: 'Flames' });

presets({
  brick: { surround: '#9a4a36', hearth: '#3b3d42' },
  rustic: { surround: '#8f8a80', hearth: '#5a5650', logs: '#4a3324' },
  dark: { surround: '#2b2d30', hearth: '#1b1c1e' },
});

const W = 1500;
const D = 450;
const H = 1250;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};

const f = assembly('fireplace');
const y0 = -D / 2;
const y1 = D / 2;
const ow = 760; // opening width
const oh = 720; // opening height
const hz = 60; // hearth height
// Breast with the opening cut out; the firebox lines the opening.
f.part('surround', blk(-W / 2, y0 + 80, hz - 1, W / 2, y1, H)
  .subtract(blk(-ow / 2, y0, hz - 10, ow / 2, y1 - 80, hz + oh)).color(surround));
f.part('firebox', blk(-ow / 2 - 1, y1 - 81, hz - 1, ow / 2 + 1, y1 - 60, hz + oh + 1)
  .union(blk(-ow / 2 - 1, y0 + 79, hz - 1, -ow / 2 + 20, y1 - 60, hz + oh + 1))
  .union(blk(ow / 2 - 20, y0 + 79, hz - 1, ow / 2 + 1, y1 - 60, hz + oh + 1))
  .union(blk(-ow / 2 - 1, y0 + 79, hz + oh - 20, ow / 2 + 1, y1 - 60, hz + oh + 1)).color(firebox));
f.part('hearth', blk(-W / 2 - 60, y0 - 100, 0, W / 2 + 60, y1, hz).color(hearth));
if (style.value === 'mantel') {
  f.part('mantel', blk(-W / 2 - 80, y0 + 20, H - 1, W / 2 + 80, y1, H + 60).color(surround));
  for (const sx of [-1, 1]) {
    const x = sx * (ow / 2 + 120);
    f.part(`pilaster-${sx < 0 ? 'left' : 'right'}`, blk(x - 90, y0 + 40, hz - 1, x + 90, y0 + 81, H - 60).color(surround));
  }
  f.part('frieze', blk(-ow / 2 - 210, y0 + 40, H - 200, ow / 2 + 210, y0 + 81, H).color(surround));
} else {
  // Rough stone surround: a lintel and two jambs of offset blocks.
  f.part('lintel', blk(-ow / 2 - 120, y0 + 50, hz + oh, ow / 2 + 120, y0 + 81, hz + oh + 180).color(hearth));
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const xi = sx * (ow / 2 + 60 + (i % 2) * 20);
      f.part(`jamb-${sx < 0 ? 'l' : 'r'}-${i + 1}`, blk(xi - 60, y0 + 55, hz + i * 240, xi + 60, y0 + 81, hz + (i + 1) * 240 - 10).color(hearth));
    }
  }
}
// Logs: three faceted cylinders stacked in the firebox.
const log = (len: number) => ngon(55, 6).extrude(len).translate(0, 0, -len / 2).rotateY(90);
const fy = y1 - 220;
f.part('log-1', log(560).rotateZ(8).translate(0, fy - 60, hz + 50).color(logs));
f.part('log-2', log(560).rotateZ(-8).translate(0, fy + 60, hz + 50).color(logs));
f.part('log-3', log(500).rotateZ(3).translate(0, fy, hz + 140).color(logs));
if (fire.value === 'lit') {
  const tongue = (x: number, hgt: number, w: number) =>
    extrudePolygon([[-w, 0], [w, 0], [w * 0.4, hgt * 0.55], [0, hgt], [-w * 0.5, hgt * 0.5]], 60).translate(0, 0, -30).rotateX(90);
  f.part('flame-1', tongue(0, 380, 110).translate(0, fy, hz + 150).color(flame));
  f.part('flame-2', tongue(0, 260, 80).translate(-150, fy + 20, hz + 140).color(flame));
  f.part('flame-3', tongue(0, 300, 90).translate(150, fy - 20, hz + 140).color(flame));
}

return f.model();
