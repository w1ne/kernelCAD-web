// Original kernelCAD low-poly corner shop: a one-storey building with a shop
// window, a glazed door, a sign band, a parapet and a striped awning. The
// front is built from full-depth vertical pieces (no decals), so the
// flat-shaded faces stay clean. Millimetres, Z up, base on z = 0, shop
// front facing -Y.

meta({
  name: 'shop-front',
  title: 'Shop front',
  description: 'Small one-storey shop with a display window, glazed door, sign band and striped awning. Knobs: width, wall, awning, awning stripe, door/sign and glass colours.',
  tags: ['shop', 'store', 'storefront', 'building', 'cafe', 'awning', 'street'],
  kit: 'city-street',
  category: 'building',
  origin: 'base',
  compat: ['outdoor', 'street', 'grid-4m'],
  triangleBudget: 500,
});

const widthMm = param('widthMm', '4000', { choices: ['4000', '6000', '8000'], label: 'Width (mm)' });
const wall = param('wall', '#d9c7a8', { label: 'Wall' });
const awning = param('awning', '#2f7d4a', { label: 'Awning' });
const stripe = param('stripe', '#f2efe6', { label: 'Awning stripe' });
const trim = param('trim', '#2b4a6b', { label: 'Door and sign' });
const glass = param('glass', '#9cc4d6', { label: 'Glass' });

presets({
  cafe: { wall: '#f0e6d6', awning: '#a8262b', stripe: '#f2efe6', trim: '#3a2a20' },
  bakery: { wall: '#e8d2b0', awning: '#e08a2a', stripe: '#f7e8c8', trim: '#6b3f22' },
  modern: { wall: '#5b6066', awning: '#2a2c2e', stripe: '#2a2c2e', trim: '#1e1e1e', glass: '#b8d8e6' },
});

const W = Number(widthMm.value);
const D = 3000;
const sh = assembly('shop-front');
const y0 = -D / 2;
const pane = 80; // glass / door panel thickness at the front
let k = 0;
// A full-depth wall block over x0..x1, z0..z1.
const block = (x0: number, x1: number, z0: number, z1: number, c: typeof wall) => {
  k += 1;
  sh.part(`b-${k}`, box(x1 - x0, D, z1 - z0, true).translate((x0 + x1) / 2, 0, (z0 + z1) / 2).color(c));
};
// A front panel (glass, door, sign) with a wall block of the same outline behind it.
const panel = (x0: number, x1: number, z0: number, z1: number, c: typeof wall) => {
  k += 1;
  sh.part(`p-${k}`, box(x1 - x0, pane, z1 - z0, true).translate((x0 + x1) / 2, y0 + pane / 2, (z0 + z1) / 2).color(c));
  sh.part(`p-${k}-back`, box(x1 - x0, D - pane, z1 - z0, true).translate((x0 + x1) / 2, pane / 2, (z0 + z1) / 2).color(wall));
};

const pil = 300; // pilaster width
const mull = 250;
const doorW = 1000;
const zSill = 600;
const zHead = 2600;
const zDoor = 2200;
const zFascia = 3000;
const zSign = 3500;
const zTop = 3800;

const xa = -W / 2;
const xDoor1 = W / 2 - pil;
const xDoor0 = xDoor1 - doorW;
const xWin0 = xa + pil;
const xWin1 = xDoor0 - mull;

block(xa, xWin0, 0, zFascia, wall); // left pilaster
block(xWin0, xWin1, 0, zSill, wall); // sill wall
panel(xWin0, xWin1, zSill, zHead, glass); // shop window
block(xWin0, xWin1, zHead, zFascia, wall); // header
block(xWin1, xDoor0, 0, zFascia, wall); // mullion
panel(xDoor0, xDoor1, 0, zDoor, trim); // door
panel(xDoor0, xDoor1, zDoor, zHead, glass); // transom
block(xDoor0, xDoor1, zHead, zFascia, wall);
block(xDoor1, W / 2, 0, zFascia, wall); // right pilaster
panel(xa, W / 2, zFascia, zSign, trim); // sign band
block(xa, W / 2, zSign, zTop, wall); // parapet
sh.part('cornice', box(W + 100, 160, 160, true).translate(0, y0 - 30, zTop - 60).color(trim));

// Awning over the window and door: a sloped slab profile in (y, z).
const ax0 = xWin0 - 100;
const ax1 = xDoor1 + 100;
const reach = 1100;
const awPts: [number, number][] = [[y0, zHead + 380], [y0 - reach, zHead - 20], [y0 - reach, zHead - 140], [y0, zHead + 300]];
const awningPiece = (x0: number, x1: number) =>
  extrudePolygon(awPts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Striped canvas: alternating awning / stripe colours (set them equal for a plain awning).
const stripes = Math.max(4, Math.round((ax1 - ax0) / 500));
const sw = (ax1 - ax0) / stripes;
for (let i = 0; i < stripes; i++) {
  sh.part(`awning-${i + 1}`, awningPiece(ax0 + i * sw, ax0 + (i + 1) * sw).color(i % 2 === 0 ? awning : stripe));
}

return sh.model();
