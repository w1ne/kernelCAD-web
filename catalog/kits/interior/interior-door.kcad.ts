// Original kernelCAD low-poly interior door: 2040 x 820 mm leaf (sizes vary)
// in a lining with architraves on both faces and a lever handle. The door lies
// in the XZ plane, wall thickness along Y. Millimetres, Z up, standing on
// z = 0 centred on x = y = 0.

meta({
  name: 'interior-door',
  title: 'Interior door',
  description: 'Hinged interior door with frame and architraves, flat or four-panel, in standard leaf widths. Knobs: width, panel style, leaf, frame and handle colours.',
  tags: ['door', 'interior door', 'doorway', 'door frame', 'room', 'entrance'],
  kit: 'interior',
  category: 'structure',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'kitchen', 'office'],
  triangleBudget: 300,
});

const widthMm = param('widthMm', '820', { choices: ['720', '820', '920'], label: 'Leaf width (mm)' });
const panels = param('panels', 'four-panel', { choices: ['flat', 'four-panel'], label: 'Panel style' });
const leaf = param('leaf', '#f2f1ec', { label: 'Door leaf' });
const frame = param('frame', '#e6e4dd', { label: 'Frame' });
const handle = param('handle', '#b8bcc0', { label: 'Handle' });

presets({
  oak: { leaf: '#b98a5a', frame: '#a07548', handle: '#2b2b2b' },
  walnut: { leaf: '#6b4630', frame: '#5a3a27', handle: '#c9a24a' },
  grey: { leaf: '#7d8288', frame: '#e6e4dd', handle: '#2b2b2b' },
});

const LW = Number(widthMm.value);
const LH = 2040;
const LT = 40; // leaf thickness
const wall = 120; // wall / lining depth
const lin = 20; // lining board
const arc = 70; // architrave width

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const d = assembly('interior-door');
const ox = LW / 2 + 3; // 3 mm gap each side
const oz = LH + 3;
// Lining (jambs and head) through the wall depth.
d.part('jamb-left', blk(-ox - lin, -wall / 2, 0, -ox, wall / 2, oz + lin).color(frame));
d.part('jamb-right', blk(ox, -wall / 2, 0, ox + lin, wall / 2, oz + lin).color(frame));
d.part('head', blk(-ox, -wall / 2, oz, ox, wall / 2, oz + lin).color(frame));
// Architraves on both faces.
for (const [side, y] of [['front', -wall / 2 - 15], ['back', wall / 2]] as const) {
  d.part(`arch-left-${side}`, blk(-ox - lin - arc + 20, y, 0, -ox - lin + 20, y + 15, oz + lin + arc - 20).color(frame));
  d.part(`arch-right-${side}`, blk(ox + lin - 20, y, 0, ox + lin + arc - 20, y + 15, oz + lin + arc - 20).color(frame));
  d.part(`arch-head-${side}`, blk(-ox - lin + 20, y, oz + lin - 20, ox + lin - 20, y + 15, oz + lin + arc - 20).color(frame));
}
// Leaf, closed, centred in the wall depth.
d.part('leaf', blk(-LW / 2, -LT / 2, 8, LW / 2, LT / 2, LH).color(leaf));
if (panels.value === 'four-panel') {
  // Raised panels on the -Y face: two tall over two short.
  const pw = (LW - 3 * 110) / 2;
  const rows: [number, number][] = [[150, 750], [900, LH - 150]];
  rows.forEach(([z0, z1], r) => {
    for (let c = 0; c < 2; c++) {
      const px = -LW / 2 + 110 + c * (pw + 110);
      d.part(`panel-${r + 1}-${c + 1}`, blk(px, -LT / 2 - 8, z0, px + pw, -LT / 2 + 1, z1).color(leaf));
    }
  });
}
// Lever handles on both faces, opposite the hinge side (+X).
const hx = LW / 2 - 70;
for (const [side, s] of [['front', -1], ['back', 1]] as const) {
  const yIn = s * (LT / 2 - 1);
  const yOut = s * (LT / 2 + 55);
  d.part(`rose-${side}`, blk(hx - 25, Math.min(yIn, s * (LT / 2 + 10)), 1000, hx + 25, Math.max(yIn, s * (LT / 2 + 10)), 1070).color(handle));
  d.part(`lever-${side}`, blk(hx - 130, Math.min(yOut - s * 20, yOut), 1025, hx + 15, Math.max(yOut - s * 20, yOut), 1045).color(handle));
  d.part(`neck-${side}`, blk(hx - 10, Math.min(yIn, yOut), 1025, hx + 10, Math.max(yIn, yOut), 1045).color(handle));
}

return d.model();
