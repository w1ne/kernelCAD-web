// Original kernelCAD low-poly chaise longue: a long upholstered seat with a
// raised, sloped back end, an optional single arm, a bolster cushion and
// turned feet. Long axis along X. Millimetres, Z up, standing on z = 0
// centred on x = y = 0. The open long side faces -Y.

meta({
  name: 'chaise-lounge',
  license: 'CC0-1.0',
  title: 'Chaise longue',
  description: 'Upholstered chaise longue day bed with a sloped back end, optional arm, bolster cushion and wooden feet. Knobs: arm, upholstery, bolster and leg colours.',
  tags: ['chaise longue', 'chaise lounge', 'daybed', 'fainting couch', 'lounge', 'sofa', 'bedroom', 'living room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'hotel'],
  triangleBudget: 300,
});

const arm = param('arm', 'yes', { choices: ['yes', 'no'], label: 'Side arm' });
const fabric = param('fabric', '#5f7f6a', { label: 'Upholstery' });
const bolster = param('bolster', '#d9c08a', { label: 'Bolster' });
const legs = param('legs', '#5a3a27', { label: 'Legs' });

presets({
  velvet: { fabric: '#7a2f45', bolster: '#c9a24a', legs: '#2b2927' },
  linen: { fabric: '#d9cfbd', bolster: '#8a9196', legs: '#a07548' },
  navy: { fabric: '#2f3e57', bolster: '#e8e0d0' },
});

const L = 1700;
const D = 680;
const seatZ = 430;
const legH = 140;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, s: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};
// XZ side profile extruded across Y (depth d from y0).
const profile = (pts: [number, number][], y0: number, d: number) => extrudePolygon(pts, d).rotateX(90).translate(0, y0 + d, 0);

const c = assembly('chaise-lounge');
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const x = sx * (L / 2 - 80);
  const y = sy * (D / 2 - 70);
  c.part(`leg-${sx}-${sy}`, ngon(28, 6).loft(ngon(18, 6), { spacing: legH + 5, ruled: true }).translate(x, y, 0).color(legs));
}
c.part('base', blk(-L / 2, -D / 2, legH, L / 2, D / 2, 300).color(fabric));
// Seat runs the length, then the back end rises in a sloped curve at -X.
const seatProf: [number, number][] = [
  [-L / 2, 299], [L / 2, 299], [L / 2, seatZ - 20], [L / 2 - 40, seatZ], [-L / 2 + 520, seatZ],
  [-L / 2 + 300, seatZ + 180], [-L / 2 + 160, seatZ + 420], [-L / 2 + 40, seatZ + 460], [-L / 2, seatZ + 420],
];
c.part('seat', profile(seatProf, -D / 2, D).color(fabric));
if (arm.value === 'yes') {
  // Arm along the back long side, from the raised end two thirds of the way.
  c.part('arm', profile([[-L / 2, seatZ - 10], [L / 2 - 500, seatZ - 10], [L / 2 - 560, seatZ + 220], [-L / 2 + 150, seatZ + 260], [-L / 2, seatZ + 260]], D / 2 - 120, 120).color(fabric));
}
c.part('bolster', ngon(90, 8).extrude(D - 140).translate(0, 0, -(D - 140) / 2).rotateX(90).translate(-L / 2 + 600, 0, seatZ + 80).color(bolster));

return c.model();
