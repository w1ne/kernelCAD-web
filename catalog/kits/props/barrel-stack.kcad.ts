// Original kernelCAD low-poly barrel stack: barrels lying on their sides in
// a pyramid on a pair of wooden chocks, ends facing the viewer, each with
// two iron hoops and a pale lid. Millimetres, Z up, base on z = 0 centred
// on x = y = 0, barrel axes along Y.

meta({
  name: 'barrel-stack',
  license: 'CC0-1.0',
  title: 'Barrel stack',
  description: 'Pyramid of wooden barrels lying on their sides on wooden chocks, for cellars, docks and taverns. Knobs: count, wood, hoop, lid and chock colours.',
  tags: ['barrels', 'barrel stack', 'casks', 'kegs', 'cellar', 'tavern', 'dock', 'storage', 'warehouse'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'medieval', 'harbour', 'warehouse', 'tavern'],
  triangleBudget: 600,
});

const count = param('count', '3', { choices: ['1', '3'], label: 'Barrels' });
const wood = param('wood', '#a5703f', { label: 'Staves' });
const iron = param('iron', '#4a4846', { label: 'Hoops' });
const lid = param('lid', '#c99a62', { label: 'Barrel ends' });
const chock = param('chock', '#6e4a2c', { label: 'Chocks' });

presets({
  aged: { wood: '#7d6449', lid: '#a89070', iron: '#5c4636' },
  wine: { wood: '#8a3a2a', lid: '#b07a5a' },
});

const n = Number(count.value);
const rows = n === 1 ? 1 : 2;
const s = 8;
const L = 820; // barrel length along Y
const rEnd = 230;
const rMid = 275;
const ngon = (r: number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / s), r * Math.sin(Math.PI / s));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / s + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Barrel along +Z from 0 to L, then laid along Y and moved so its axis sits at (x, zc).
const lay = (sh: Shape, x: number, zc: number) => sh.rotateX(-90).translate(x, -L / 2, zc);

const bs = assembly('barrel-stack');
const lift = 60; // chock height under the bottom row
const pitch = 2 * rMid * 0.98;
let id = 0;
for (let row = 0; row < rows; row++) {
  const k = rows - row; // barrels in this row
  const zc = lift + rMid * Math.cos(Math.PI / s) + row * pitch * 0.86;
  for (let i = 0; i < k; i++) {
    id++;
    const x = (i - (k - 1) / 2) * pitch;
    bs.part(`barrel-${id}`, lay(ngon(rEnd).loft([ngon(rMid), ngon(rEnd)], {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, L / 2] },
        { plane: 'XY', origin: [0, 0, L] },
      ],
      ruled: true,
    }), x, zc).color(wood));
    bs.part(`ends-${id}`, lay(ngon(rEnd * 0.9).extrude(L + 16).translate(0, 0, -8), x, zc).color(lid));
    for (const [h, f] of [[1, 0.2], [2, 0.8]] as [number, number][]) {
      const r = rEnd + (rMid - rEnd) * (1 - Math.abs(f - 0.5) * 2) + 12;
      bs.part(`hoop-${id}-${h}`, lay(ngon(r).extrude(40).translate(0, 0, f * L - 20), x, zc).color(iron));
    }
  }
}
// Two chocks under the bottom row: low beams across X.
const W = rows * pitch;
for (const [i, y] of [[1, -L * 0.3], [2, L * 0.3]] as [number, number][]) {
  bs.part(`chock-${i}`, box(W, 120, lift + 70, true).translate(0, y, (lift + 70) / 2).color(chock));
}

return bs.model();
