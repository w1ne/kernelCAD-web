// Original kernelCAD low-poly traffic signal: a three-aspect signal head on a
// post, or hung from a mast arm over the road. Each aspect is a housing cell
// with an octagonal lens set flush through it, plus a visor.
// Millimetres, Z up, base on z = 0, lenses face -Y.

meta({
  name: 'traffic-light',
  title: 'Traffic light',
  description: 'Three-aspect traffic signal on a post or a mast arm, with visors. Knobs: mount style, red, amber and green lens colours, housing and pole colours.',
  tags: ['traffic light', 'signal', 'stoplight', 'intersection', 'junction', 'road', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 500,
});

const mount = param('mount', 'post', { choices: ['post', 'mast'], label: 'Mount' });
const red = param('red', '#e0322a', { label: 'Red lens' });
const amber = param('amber', '#f2a81d', { label: 'Amber lens' });
const green = param('green', '#2fbf5a', { label: 'Green lens' });
const housing = param('housing', '#2a2c2e', { label: 'Housing' });
const pole = param('pole', '#6e757c', { label: 'Pole' });

presets({
  'all-off': { red: '#5a2422', amber: '#5a4a22', green: '#22402c' },
  yellow: { housing: '#e8b81c', pole: '#2a2c2e' },
});

const ngon = (r: number, s = 8) => {
  let p = path().moveTo(r * Math.cos(Math.PI / s), r * Math.sin(Math.PI / s));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / s + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const cellW = 320;
const cellH = 300;
const cellD = 220;
const lensR = 112;
const isMast = mount.value === 'mast';
const tl = assembly('traffic-light');

// Signal head origin: bottom-centre of the head.
const headX = isMast ? 3600 : 0;
const headZ = isMast ? 4300 : 2300;
const headY = isMast ? 0 : -cellD / 2 - 70; // post mount: head in front of the pole
const lamps: [string, typeof red][] = [['green', green], ['amber', amber], ['red', red]];
lamps.forEach(([name, colour], i) => {
  const zc = headZ + cellH / 2 + i * cellH;
  // Lens prism (full cell depth) and the cell with a matching through-hole.
  const lens = ngon(lensR).extrude(cellD).rotateX(90).translate(headX, headY + cellD / 2, zc);
  const cell = box(cellW, cellD, cellH, true).translate(headX, headY, zc);
  tl.part(`cell-${name}`, cell.subtract(ngon(lensR).extrude(cellD + 40).rotateX(90).translate(headX, headY + cellD / 2 + 20, zc)).color(housing));
  tl.part(`lens-${name}`, lens.color(colour));
  tl.part(`visor-${name}`, box(cellW - 60, 140, 20, true).translate(headX, headY - cellD / 2 - 70, zc + lensR + 10).color(housing));
});
tl.part('head-cap', box(cellW + 20, cellD + 20, 30, true).translate(headX, headY, headZ + 3 * cellH + 15).color(housing));

if (isMast) {
  tl.part('pole', ngon(130).loft(ngon(90), { spacing: 5600, ruled: true }).color(pole));
  tl.part('arm', box(4200, 110, 130, true).translate(2100, 0, 5450).color(pole));
  tl.part('hanger', box(60, 60, 5450 - (headZ + 3 * cellH + 30)).translate(headX - 30, -30, headZ + 3 * cellH + 30).color(pole));
} else {
  tl.part('pole', ngon(65).extrude(headZ + 3 * cellH).color(pole));
  tl.part('bracket', box(80, 140, 80, true).translate(0, -cellD / 2 + 10, headZ + 1.5 * cellH).color(pole));
}
tl.part('base', ngon(isMast ? 260 : 150).extrude(60).color(pole));

return tl.model();
