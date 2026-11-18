// Original kernelCAD low-poly military ammunition crate: a painted plank
// box with a battened lid, chunky end cleats, rope loop handles, steel
// latches and a stencilled paint band, single or stacked two high.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, latches towards -Y.

meta({
  name: 'ammo-crate',
  license: 'CC0-1.0',
  title: 'Ammo crate',
  description: 'Military wooden ammunition crate with battened lid, end cleats, rope handles, steel latches and a stencil paint band, short or long, single or stacked. Knobs: length, stack, wood, band, rope and latch colours.',
  tags: ['ammo crate', 'ammo box', 'crate', 'military', 'army', 'supply', 'munitions', 'box'],
  kit: 'containers',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'military', 'warehouse', 'bunker', 'camp'],
  triangleBudget: 560,
});

const length = param('length', 'short', { choices: ['short', 'long'], label: 'Length' });
const stack = param('stack', '1', { choices: ['1', '2'], label: 'Stacked crates' });
const wood = param('wood', '#58613a', { label: 'Painted wood' });
const band = param('band', '#e0b830', { label: 'Stencil band' });
const rope = param('rope', '#b8a070', { label: 'Rope handles' });
const metal = param('metal', '#3a3c3e', { label: 'Latches' });

presets({
  desert: { wood: '#b09a6a', band: '#3a3a2a' },
  raw: { wood: '#a8804a', band: '#2a2a2a', rope: '#7a6040' },
  winter: { wood: '#d8dad6', band: '#c8302a' },
});

const L = length.value === 'long' ? 1200 : 750;
const W = 420;
const H = 300; // box height with lid
const n = Number(stack.value);
const cl = 30; // cleat thickness

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const c = assembly('ammo-crate');
for (let i = 0; i < n; i++) {
  const z = i * (H + 17); // upper crate rests on the lower lid battens
  const id = i + 1;
  // Box, then a slightly overhanging lid with a batten at each end.
  c.part(`box-${id}`, blk(-L / 2, -W / 2, z, L / 2, W / 2, z + H - 70).color(wood));
  c.part(`lid-${id}`, blk(-L / 2 - 4, -W / 2 - 4, z + H - 72, L / 2 + 4, W / 2 + 4, z + H)
    .union(blk(-L / 2 + 30, -W / 2 - 10, z + H - 10, -L / 2 + 120, W / 2 + 10, z + H + 18))
    .union(blk(L / 2 - 120, -W / 2 - 10, z + H - 10, L / 2 - 30, W / 2 + 10, z + H + 18))
    .color(wood));
  // End cleats: a frame of thick battens on each end.
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -L / 2 - cl : L / 2 - 1;
    const t = sx < 0 ? 'l' : 'r';
    c.part(`cleat-${id}-${t}`, blk(x0, -W / 2, z, x0 + cl + 1, W / 2, z + H)
      .subtract(blk(x0 - 10, -W / 2 + 50, z + 45, x0 + cl + 11, W / 2 - 50, z + H - 45).translate(sx * (cl - 12), 0, 0))
      .color(wood));
    // Rope handle: a U loop hanging out from the end between the cleats.
    const xr = sx < 0 ? -L / 2 - 20 : L / 2;
    c.part(`rope-${id}-${t}`, extrudePolygon([[-95, 0], [-75, 0], [-55, -60], [55, -60], [75, 0], [95, 0], [70, -80], [-70, -80]], 20)
      .rotateX(90).rotateZ(90).translate(xr, 0, z + H - 70).color(rope));
  }
  // Paint band round the middle of the long sides and over the lid.
  c.part(`band-${id}`, blk(-80, -W / 2 - 2, z, 80, W / 2 + 2, z + H + 2).color(band));
  // Two steel latches across the lid seam on the front.
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - 200);
    c.part(`latch-${id}-${sx < 0 ? 'l' : 'r'}`, blk(x - 30, -W / 2 - 12, z + H - 120, x + 30, -W / 2 + 1, z + H - 35)
      .union(blk(x - 18, -W / 2 - 18, z + H - 100, x + 18, -W / 2 - 8, z + H - 70))
      .color(metal));
  }
}

return c.model();
