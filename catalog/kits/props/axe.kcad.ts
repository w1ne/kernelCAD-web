// Original kernelCAD low-poly axe lying on the ground as a pickup item: a
// hexagonal haft with a flared bit, as a woodcutter's axe or a double-bitted
// battle axe. Millimetres, Z up, base on z = 0 centred on x = y = 0, haft
// along X with the head at +X.

meta({
  name: 'axe',
  license: 'CC0-1.0',
  title: 'Axe',
  description: 'Axe lying flat as a pickup or tool prop: single-bit woodcutter axe or double-bitted battle axe on a wooden haft. Knobs: style, haft length, head, edge and haft colours.',
  tags: ['axe', 'hatchet', 'woodcutter', 'battle axe', 'weapon', 'tool', 'medieval', 'fantasy', 'item', 'pickup'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'medieval', 'fantasy', 'forest', 'workshop'],
  triangleBudget: 160,
});

const style = param('style', 'woodcutter', { choices: ['woodcutter', 'battle'], label: 'Style' });
const length = param('length', 'long', { choices: ['hatchet', 'long'], label: 'Haft length' });
const head = param('head', '#5a5e63', { label: 'Head' });
const edge = param('edge', '#c9ced3', { label: 'Sharpened edge' });
const haft = param('haft', '#a8743f', { label: 'Haft' });

presets({
  rusty: { head: '#6a4a36', edge: '#9a7a62' },
  fantasy: { head: '#2f3a52', edge: '#8ad0ff', haft: '#5a3a2a' },
});

const L = length.value === 'hatchet' ? 400 : 800;
const T = 36; // head thickness (Z)
const zc = T / 2;
const a = assembly('axe');
// Haft: hexagonal rod along X, its lowest vertex just above the floor.
const r = 16;
let hex = path().moveTo(r, 0);
for (let k = 1; k < 6; k++) hex = hex.lineTo(r * Math.cos((Math.PI * k) / 3), r * Math.sin((Math.PI * k) / 3));
a.part('haft', hex.close().extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(haft));

// Head profile in XY around the haft end at x = hx; the main bit points to -Y
// (towards the viewer), the edge strip sits on the blade's cutting edge.
const hx = L / 2 - 60;
const bitPts = (dir: number): [number, number][] => {
  const pts: [number, number][] = [[hx - 35, 0], [hx + 35, 0], [hx + 30, dir * 60], [hx + 95, dir * 175], [hx - 100, dir * 195], [hx - 35, dir * 60]];
  return dir > 0 ? pts : pts.slice().reverse();
};
const edgeStrip = (dir: number) => {
  const pts: [number, number][] = [[hx + 95, dir * 175], [hx - 100, dir * 195], [hx - 104, dir * 215], [hx + 103, dir * 193]];
  return extrudePolygon(dir > 0 ? pts.slice().reverse() : pts, T - 10).translate(0, 0, 5);
};
let h = extrudePolygon(bitPts(-1), T).union(box(80, 70, T, true).translate(hx, 0, zc));
if (style.value === 'battle') {
  h = h.union(extrudePolygon(bitPts(1), T));
} else {
  // Poll: a short square butt behind the haft.
  h = h.union(box(70, 90, T, true).translate(hx, 70, zc));
}
a.part('head', h.color(head));
a.part('edge', edgeStrip(-1).color(edge));
if (style.value === 'battle') a.part('edge-back', edgeStrip(1).color(edge));

return a.model();
