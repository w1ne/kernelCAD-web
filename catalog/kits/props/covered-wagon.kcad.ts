// Original kernelCAD low-poly covered wagon: a plank wagon box on four
// spoked wheels (small at the front, large at the back) under an arched
// canvas cover, with a seat board and a pulling tongue. Millimetres, Z up,
// base on z = 0 centred on x = y = 0, tongue towards -Y.

meta({
  name: 'covered-wagon',
  license: 'CC0-1.0',
  title: 'Covered wagon',
  description: 'Pioneer covered wagon with arched canvas top, plank box, driver seat, tongue and four spoked wheels. Knobs: cover, wood, wheel, canvas and opening colours.',
  tags: ['wagon', 'covered wagon', 'cart', 'prairie schooner', 'caravan', 'western', 'medieval', 'travel', 'vehicle'],
  kit: 'props',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'western', 'medieval', 'fantasy', 'farm', 'village'],
  triangleBudget: 600,
});

const cover = param('cover', 'yes', { choices: ['yes', 'no'], label: 'Canvas cover' });
const wood = param('wood', '#8a5a33', { label: 'Wagon box' });
const wheel = param('wheel', '#5a3e28', { label: 'Wheels' });
const canvas = param('canvas', '#efe6cc', { label: 'Canvas' });
const opening = param('opening', '#3a3226', { label: 'Cover opening' });

presets({
  painted: { wood: '#2f5a8a', wheel: '#a8302a' },
  weathered: { wood: '#7d6a55', canvas: '#cfc4a8' },
});

const L = 2800;
const W = 1100;
const bedZ = 750;
const boxH = 450;
const s8 = 8;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Regular polygon with a flat edge at the bottom once rotated into the YZ plane.
const ngon = (r: number, n: number) => {
  const rot = Math.PI / n;
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};

const wg = assembly('covered-wagon');
wg.part('box', blk(-W / 2, -L / 2, bedZ, W / 2, L / 2, bedZ + boxH).color(wood));
// Driver's bench on a riser at the front of the box.
wg.part('seat', blk(-W / 2 - 20, -L / 2 - 20, bedZ + boxH + 60, W / 2 + 20, -L / 2 + 330, bedZ + boxH + 110).color(wood));
wg.part('seat-riser', blk(-W / 2 + 60, -L / 2 + 230, bedZ + boxH - 2, W / 2 - 60, -L / 2 + 290, bedZ + boxH + 61).color(wood));
// Running gear: axles under the box and a tongue reaching forward.
const axles: [string, number, number][] = [['front', -L / 2 + 520, 470], ['back', L / 2 - 520, 620]];
for (const [nm, y, R] of axles) {
  const ac = R * Math.cos(Math.PI / s8); // axle height with a flat at the bottom
  wg.part(`axle-${nm}`, blk(-W / 2 - 140, y - 40, ac - 40, W / 2 + 140, y + 40, ac + 40).color(wood));
  wg.part(`bolster-${nm}`, blk(-W / 2 + 100, y - 60, ac + 39, W / 2 - 100, y + 60, bedZ + 1).color(wood));
  for (const sx of [-1, 1]) {
    const x0 = sx * (W / 2 + 70);
    const disc = (r: number, n: number, t: number) => ngon(r, n).extrude(t).rotateY(90).translate(x0 - t / 2, y, ac);
    const side = sx < 0 ? 'left' : 'right';
    wg.part(`rim-${nm}-${side}`, disc(R, s8, 70).subtract(disc(R - 70, s8, 90)).color(wheel));
    // Two crossed bars make four spokes; a hexagonal hub.
    // Two crossing bars make four spokes and read as the hub where they meet.
    wg.part(`spoke-a-${nm}-${side}`, box(60, 2 * R - 140, 50, true).translate(x0, y, ac).color(wheel));
    wg.part(`spoke-b-${nm}-${side}`, box(60, 50, 2 * R - 140, true).translate(x0, y, ac).color(wheel));
  }
}
wg.part('tongue', blk(-40, -L / 2 - 1500, 380, 40, -L / 2 + 560, 440).color(wood));
wg.part('singletree', blk(-350, -L / 2 - 1500, 380, 350, -L / 2 - 1440, 440).color(wood));

if (cover.value === 'yes') {
  // Arched cover: a half-octagon section extruded along Y, slightly flared ends.
  const arch: [number, number][] = [];
  const R = W / 2 + 40;
  for (let k = 0; k <= 4; k++) {
    const a = (Math.PI * k) / 4;
    arch.push([R * Math.cos(a), R * 1.6 * Math.sin(a) * 0.82]);
  }
  wg.part('canvas', extrudePolygon(arch, L - 300).rotateX(90).translate(0, L / 2 - 120, bedZ + boxH - 20).color(canvas));
  // Flared hoop ends where the canvas is drawn over the bows.
  const flare = arch.map(([x, z]) => [x * 1.08, z * 1.06] as [number, number]);
  wg.part('canvas-back', extrudePolygon(flare, 120).rotateX(90).translate(0, L / 2 - 20, bedZ + boxH - 22).color(canvas));
  wg.part('canvas-front', extrudePolygon(flare, 120).rotateX(90).translate(0, -L / 2 + 400, bedZ + boxH - 22).color(canvas));
  wg.part('opening', extrudePolygon(arch.map(([x, z]) => [x * 0.75, z * 0.78]), 10).rotateX(90).translate(0, -L / 2 + 285, bedZ + boxH - 21).color(opening));
}

return wg.model();
