// Original kernelCAD low-poly firewood stack: split logs piled in a pyramid
// between two stakes, each log a faceted bark prism with a paler core
// showing at both cut ends, optionally under a small plank roof.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, logs along Y.

meta({
  name: 'firewood-stack',
  license: 'CC0-1.0',
  title: 'Firewood stack',
  description: 'Pile of split firewood logs with pale cut ends between two stakes, optionally under a plank roof. Knobs: rows, roof, bark, cut wood and stake colours.',
  tags: ['firewood', 'wood pile', 'log pile', 'logs', 'woodpile', 'lumber', 'cabin', 'farm', 'forest'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'forest', 'farm', 'cabin', 'medieval', 'village', 'camp'],
  triangleBudget: 580,
});

const rows = param('rows', '3', { choices: ['2', '3', '4'], label: 'Rows' });
const roof = param('roof', 'no', { choices: ['no', 'yes'], label: 'Plank roof' });
const bark = param('bark', '#6a4a2e', { label: 'Bark' });
const cut = param('cut', '#dcb67e', { label: 'Cut ends' });
const stake = param('stake', '#4f3a26', { label: 'Stakes and roof' });

presets({
  birch: { bark: '#e8e4dc', cut: '#e6cf9a' },
  snowy: { stake: '#3a2e22' },
});

const nRows = Number(rows.value);
const r = 95; // log radius
const L = 650; // log length
const pitch = 2 * r * 0.95;

const ngon = (rr: number, n: number, rot: number) => {
  let p = path().moveTo(rr * Math.cos(rot), rr * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(rr * Math.cos(rot + (2 * Math.PI * k) / n), rr * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const fw = assembly('firewood-stack');
let id = 0;
const bottom = nRows + 1;
for (let row = 0; row < nRows; row++) {
  const k = bottom - row;
  for (let i = 0; i < k; i++) {
    id++;
    // Alternate pentagon and hexagon sections, jittered rotation, so the pile looks split.
    const sides = id % 2 === 0 ? 5 : 6;
    const rot = id * 0.7;
    const x = (i - (k - 1) / 2) * pitch;
    const a0 = rot + Math.PI / 2 - Math.PI / sides;
    // Laying the log maps section +Y to -Z, so its lowest point is the largest vertex y.
    let maxY = 0;
    for (let q = 0; q < sides; q++) maxY = Math.max(maxY, r * Math.sin(a0 + (2 * Math.PI * q) / sides));
    const zc = maxY + row * pitch * 0.86;
    const dy = 25 * Math.sin(id * 2.3);
    // Logs are built along Z then laid along Y; lowest flat face on the row below.
    const lay = (sh: Shape) => sh.rotateX(-90).translate(x, -L / 2 + dy, zc);
    fw.part(`log-${id}`, lay(ngon(r, sides, a0).extrude(L)).color(bark));
    fw.part(`end-${id}`, lay(ngon(r * 0.78, sides, a0).extrude(L + 12).translate(0, 0, -6)).color(cut));
  }
}
const halfW = (bottom * pitch) / 2 + 40;
const topZ = nRows * pitch * 0.86 + 120;
for (const sx of [-1, 1]) {
  fw.part(`stake-${sx < 0 ? 'left' : 'right'}`, blk(sx * halfW - 30, -30, 0, sx * halfW + 30, 30, topZ + 20).color(stake));
}
if (roof.value === 'yes') {
  fw.part('roof', blk(-halfW - 80, -L / 2 - 80, topZ + 19, halfW + 80, L / 2 + 80, topZ + 50).color(stake));
}

return fw.model();
