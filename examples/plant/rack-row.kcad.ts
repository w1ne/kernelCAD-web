// Data-center rack row: 40 bayed 42U cabinets (600 W x 1200 D x 2000 H mm)
// with perforated front doors, split perforated rear doors, 19-inch mounting
// rails, servers, top-of-rack switches and blanking panels, side panels on
// the two row ends and a cable ladder over the row on roof-mounted brackets.
// 1,066 parts from 12 unique shapes: every repeated part comes from the same
// helper call and is placed with `at` (and `rotate` for the mirrored rails,
// the second rear-door leaf and the far side panel), so identical shapes
// share one geometry — see `inspect({ of: 'assembly' }).uniqueGeometries`.
//
// Cabinet frame (local, mm): x 0..600 wide, y 0..1200 deep (front door on
// the -y face, cold aisle), z 0..1999 tall. Cabinets repeat every 602 mm
// along +x. Every part's bounding box keeps >= 1 mm from its neighbours.

const RACKS = 40;
const PITCH = 602;
const U = 44.45;
const U1 = 90; // bottom of rack unit 1
const arm = assembly('rack-row');

const CABINET = '#a9b0b9';
const STEEL = '#e3e6e9';
const SERVER = '#7d838b';

// Plinth frame (z 31..81) with four levelling feet underneath.
const plinth = () => {
  const ring = box(600, 1200, 50).subtract(box(520, 1120, 60).translate(40, 40, -5)).translate(0, 0, 31);
  const foot = (x: number, y: number) =>
    union(cylinder(8, 18).translate(x, y, 0), cylinder(28, 8).translate(x, y, 6));
  return union(ring, foot(20, 20), foot(580, 20), foot(20, 1180), foot(580, 1180)).color(CABINET);
};
// Roof with front and rear brush-strip cable entries.
const roof = () => box(600, 1200, 40)
  .subtract(box(400, 80, 60).translate(100, 60, -10))
  .subtract(box(400, 80, 60).translate(100, 1060, -10))
  .color(CABINET);
const post = () => box(40, 40, 1876).color(CABINET);
// 19-inch mounting rail, L profile: front flange (x 0..30) and side web (y 0..60).
const rail = () => union(box(30, 2.5, 1876), box(2.5, 60, 1876)).color(STEEL);
// Perforated door: 22 mm deep pan with a slotted front skin and a swing handle.
const door = (w: number, cols: number, handleX: number) => box(w, 22, 1874)
  .subtract(box(w - 60, 22, 1794).translate(30, 2, 40))
  .subtract(box(46, 10, 22).translate(50, -4, 80).patternGrid({
    x: { count: cols, direction: [1, 0, 0], spacing: 84 },
    y: { count: 46, direction: [0, 0, 1], spacing: 37 },
  }))
  .union(box(24, 25, 180).translate(handleX, -25, 850))
  .color(CABINET);
const frontDoor = () => door(596, 6, 546);
const rearLeaf = () => door(296, 3, 14);
// 2U server: 446 wide body between the rails, twelve drive-bay recesses.
const server = () => box(446, 750, 87)
  .subtract(box(100, 4, 25).translate(14, -2, 4).patternGrid({
    x: { count: 4, direction: [1, 0, 0], spacing: 104 },
    y: { count: 3, direction: [0, 0, 1], spacing: 28 },
  }))
  .color(SERVER);
// 1U top-of-rack switch with 24 port recesses.
const torSwitch = () => box(446, 400, 43.5)
  .subtract(box(14, 4, 12).translate(60, -2, 8).patternGrid({
    x: { count: 12, direction: [1, 0, 0], spacing: 18 },
    y: { count: 2, direction: [0, 0, 1], spacing: 16 },
  }))
  .color('#5f88ba');
// 8U blanking panel on the front rail flanges, one groove per rack unit.
const blanking = () => box(482.6, 2, 8 * U - 1)
  .subtract(box(470, 1, 1).translate(6.3, -0.5, U - 1).patternLinear({ count: 7, direction: [0, 0, 1], spacing: U }))
  .color('#8b9199');
// Row-end side panel with two recessed lift handles on its outer (x = 0) face.
const sidePanel = () => box(15, 1200, 1968)
  .subtract(box(6, 160, 40).translate(-1, 520, 1500))
  .subtract(box(6, 160, 40).translate(-1, 520, 400))
  .color(CABINET);
// 3 m cable ladder section: two C stringers and rungs every 300 mm.
const ladder = () => union(
  box(3008, 3, 100), box(3008, 25, 3),
  box(3008, 3, 100).translate(0, 297, 0), box(3008, 25, 3).translate(0, 275, 0),
  box(30, 294, 15).translate(4, 3, 0).patternLinear({ count: 10, direction: [1, 0, 0], spacing: 330 }),
).color(STEEL);
// Roof-mounted ladder bracket: base plate, post and cross arm.
const bracket = () => union(
  box(120, 120, 6).translate(0, 110, 0),
  box(40, 40, 175).translate(40, 150, 6),
  box(60, 340, 19).translate(30, 0, 180),
).color(STEEL);

function addRack(i: number): void {
  const x0 = i * PITCH;
  const name = (part: string) => `rack-${i}-${part}`;
  arm.part(name('plinth'), plinth(), { at: [x0, 0, 0], material: 'mild-steel' });
  [[0, 0], [560, 0], [0, 1160], [560, 1160]].forEach(([x, y], k) =>
    arm.part(name(`post-${k}`), post(), { at: [x0 + x, y, 82], material: 'mild-steel' }));
  arm.part(name('roof'), roof(), { at: [x0, 0, 1959], material: 'mild-steel' });
  // One rail shape, mirrored into the four corners by rotation.
  arm.part(name('rail-front-left'), rail(), { at: [x0 + 45, 150, 82], material: 'mild-steel' });
  arm.part(name('rail-front-right'), rail(), { at: [x0 + 555, 150, 1958], rotate: [0, 180, 0], material: 'mild-steel' });
  arm.part(name('rail-rear-left'), rail(), { at: [x0 + 45, 1050, 1958], rotate: [180, 0, 0], material: 'mild-steel' });
  arm.part(name('rail-rear-right'), rail(), { at: [x0 + 555, 1050, 82], rotate: [0, 0, 180], material: 'mild-steel' });
  for (let k = 0; k < 8; k++) {
    arm.part(name(`server-${k}`), server(), { at: [x0 + 77, 152, U1 + 2 * U * k], material: 'mild-steel' });
  }
  for (let k = 0; k < 3; k++) {
    arm.part(name(`blank-${k}`), blanking(), { at: [x0 + 58.7, 146, U1 + U * (16 + 8 * k)], material: 'mild-steel' });
  }
  for (let k = 0; k < 2; k++) {
    arm.part(name(`switch-${k}`), torSwitch(), { at: [x0 + 77, 152, U1 + U * (40 + k)], material: 'mild-steel' });
  }
  arm.part(name('front-door'), frontDoor(), { at: [x0 + 2, -23, 82], material: 'mild-steel' });
  // Rear leaves face +y: the left leaf is turned 180 deg about Z, the right
  // one 180 deg about X, so both handles meet at the centre.
  arm.part(name('rear-door-left'), rearLeaf(), { at: [x0 + 298, 1223, 82], rotate: [0, 0, 180], material: 'mild-steel' });
  arm.part(name('rear-door-right'), rearLeaf(), { at: [x0 + 302, 1223, 1956], rotate: [180, 0, 0], material: 'mild-steel' });
}

for (let i = 0; i < RACKS; i++) addRack(i);

// Side panels close the two row ends; the far one is the same shape turned
// 180 deg about Z so its handles face outwards too.
arm.part('side-panel-near', sidePanel(), { at: [-16, 0, 31], material: 'mild-steel' });
arm.part('side-panel-far', sidePanel(), { at: [RACKS * PITCH + 14, 1200, 31], rotate: [0, 0, 180], material: 'mild-steel' });

// Cable ladder over the rear half of the row, one section per five cabinets,
// each on two brackets standing on cabinet roofs.
const SECTIONS = Math.floor(RACKS / 5);
for (let s = 0; s < SECTIONS; s++) {
  arm.part(`ladder-${s}`, ladder(), { at: [s * 5 * PITCH, 800, 2200], material: 'mild-steel' });
  [1, 3].forEach((r, k) =>
    arm.part(`ladder-${s}-bracket-${k}`, bracket(), { at: [(5 * s + r) * PITCH + 240, 780, 2000], material: 'mild-steel' }));
}

return arm.model();
