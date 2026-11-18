// Original kernelCAD low-poly two-wheeled hand cart: a plank bed with slatted
// side boards on two big spoked wheels, pulling shafts out front and a prop
// leg at the back. Millimetres, Z up, base on z = 0 centred on x = y = 0,
// shafts towards -Y.

meta({
  name: 'hand-cart',
  license: 'CC0-1.0',
  title: 'Hand cart',
  description: 'Two-wheeled wooden hand cart with plank bed, slatted side boards, spoked wheels and pulling shafts, empty or loaded with crates. Knobs: sides, load, spokes, wood, wheel, iron and cargo colours.',
  tags: ['cart', 'hand cart', 'handcart', 'barrow', 'wagon', 'medieval', 'market', 'farm'],
  kit: 'props',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'medieval', 'farm', 'market', 'street', 'fantasy'],
  triangleBudget: 600,
});

const sides = param('sides', 'slats', { choices: ['slats', 'none'], label: 'Side boards' });
const load = param('load', 'empty', { choices: ['empty', 'crates', 'hay'], label: 'Load' });
const spokes = param('spokes', '6', { choices: ['4', '6'], label: 'Spokes' });
const wood = param('wood', '#a8763f', { label: 'Wood' });
const wheel = param('wheel', '#6e4a2c', { label: 'Wheels' });
const iron = param('iron', '#3b3b3d', { label: 'Iron fittings' });
const cargo = param('cargo', '#d9b65a', { label: 'Cargo' });

presets({
  weathered: { wood: '#8c8070', wheel: '#5d5348' },
  painted: { wood: '#a23a2c', wheel: '#e0b23a' },
});

const L = 1500;
const W = 900;
const bedZ = 520;
const R = 470;
const ns = Number(spokes.value);

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const cart = assembly('hand-cart');
cart.part('bed', blk(-W / 2, -L / 2, bedZ, W / 2, L / 2, bedZ + 40).color(wood));
cart.part('bearer-left', blk(-W / 2 + 60, -L / 2, bedZ - 60, -W / 2 + 140, L / 2, bedZ + 1).color(wood));
cart.part('bearer-right', blk(W / 2 - 140, -L / 2, bedZ - 60, W / 2 - 60, L / 2, bedZ + 1).color(wood));
// Shafts run forward from under the bed; a prop leg holds the back level.
for (const side of [-1, 1]) {
  cart.part(`shaft-${side < 0 ? 'left' : 'right'}`, blk(side * (W / 2 - 100) - 30, -L / 2 - 900, bedZ - 50, side * (W / 2 - 100) + 30, -L / 2 + 300, bedZ - 1).color(wood));
}
cart.part('shaft-bar', blk(-W / 2 + 70, -L / 2 - 900, bedZ - 50, W / 2 - 70, -L / 2 - 840, bedZ - 1).color(wood));
cart.part('prop-leg', blk(-40, L / 2 - 120, 0, 40, L / 2 - 50, bedZ - 59).color(wood));

if (sides.value === 'slats') {
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - 20);
    const nm = side < 0 ? 'left' : 'right';
    for (const [i, y] of [-L / 2 + 30, L / 2 - 30].entries()) {
      cart.part(`stake-${nm}-${i + 1}`, blk(x - 20, y - 30, bedZ + 39, x + 20, y + 30, bedZ + 420).color(wood));
    }
    for (const [j, z] of [bedZ + 150, bedZ + 330].entries()) {
      cart.part(`rail-${nm}-${j + 1}`, blk(x - 22 + side * 22, -L / 2, z, x + 22 + side * 22, L / 2, z + 70).color(wood));
    }
  }
  cart.part('tailboard', blk(-W / 2, L / 2 - 30, bedZ + 39, W / 2, L / 2, bedZ + 300).color(wood));
}

// Wheels: a ten-sided wooden rim and a hub with spokes.
const axleY = 120;
for (const side of [-1, 1]) {
  const nm = side < 0 ? 'left' : 'right';
  const x0 = side * (W / 2 + 40);
  const disc = (r: number, n: number, t: number) => ngon(r, n).extrude(t).rotateY(90).translate(x0 - t / 2, axleY, R);
  // Separate overlapping parts keep the wheel cheap: no boolean seams.
  cart.part(`rim-${nm}`, disc(R, 10, 60).subtract(disc(R - 60, 10, 80)).color(wheel));
  cart.part(`hub-${nm}`, disc(80, 6, 120).color(wheel));
  for (let k = 0; k < ns; k++) {
    cart.part(`spoke-${nm}-${k + 1}`, box(36, 30, R - 50, true).translate(0, 0, (R - 50) / 2 + 30).rotateX((360 * k) / ns + 15).translate(x0, axleY, R).color(wheel));
  }
}
// One iron axle rod through both hubs, showing as hub caps outside the wheels.
cart.part('axle', ngon(45, 6).extrude(W + 260).rotateY(90).translate(-W / 2 - 130, axleY, R).color(iron));

if (load.value === 'crates') {
  cart.part('cargo-1', blk(-380, -600, bedZ + 40, 20, -200, bedZ + 400).color(cargo));
  cart.part('cargo-2', blk(40, -560, bedZ + 40, 380, -220, bedZ + 340).color(cargo));
  cart.part('cargo-3', blk(-340, 0, bedZ + 40, 340, 520, bedZ + 380).color(cargo));
} else if (load.value === 'hay') {
  cart.part('cargo-1', path().moveTo(-W / 2 + 40, -L / 2 + 40).lineTo(W / 2 - 40, -L / 2 + 40).lineTo(W / 2 - 40, L / 2 - 40).lineTo(-W / 2 + 40, L / 2 - 40).close()
    .loft(path().moveTo(-200, -400).lineTo(200, -400).lineTo(200, 400).lineTo(-200, 400).close(), { spacing: 650, ruled: true })
    .translate(0, 0, bedZ + 39).color(cargo));
}

return cart.model();
