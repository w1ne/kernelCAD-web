// Original kernelCAD low-poly weapon rack: a wooden stand with a slotted
// base and a top rail holding swords hilt-up and tall spears, with a round
// shield leaning against one end. Millimetres, Z up, base on z = 0 centred
// on x = y = 0, faces -Y.

meta({
  name: 'weapon-rack',
  license: 'CC0-1.0',
  title: 'Weapon rack',
  description: 'Armoury weapon rack holding swords and spears with a round shield leaning on it, for castles, barracks and arenas. Knobs: swords, spears, shield, wood, steel, grip and shield colours.',
  tags: ['weapon rack', 'weapons', 'swords', 'spears', 'shield', 'armory', 'armoury', 'barracks', 'medieval', 'fantasy'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'medieval', 'fantasy', 'castle', 'dungeon'],
  triangleBudget: 520,
});

const swords = param('swords', '3', { choices: ['2', '3', '4'], label: 'Swords' });
const spears = param('spears', '2', { choices: ['0', '1', '2'], label: 'Spears' });
const shield = param('shield', 'yes', { choices: ['yes', 'no'], label: 'Shield' });
const wood = param('wood', '#6e4a2c', { label: 'Rack wood' });
const steel = param('steel', '#b9bec4', { label: 'Blades' });
const grip = param('grip', '#5a3a2a', { label: 'Grips and shafts' });
const shieldC = param('shieldC', '#a8302a', { label: 'Shield' });

presets({
  royal: { shieldC: '#2f4f9a', grip: '#c9a43a' },
  dark: { wood: '#3a2a20', steel: '#6a6e73', shieldC: '#3a3a3e' },
});

const ns = Number(swords.value);
const np = Number(spears.value);
const nSlots = ns + np;
const pitch = 230;
const W = Math.max(3, nSlots) * pitch + 100;
const railZ = 820;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const r = assembly('weapon-rack');
r.part('base', blk(-W / 2, -150, 0, W / 2, 150, 120).color(wood));
for (const sx of [-1, 1]) r.part(`post-${sx < 0 ? 'left' : 'right'}`, blk(sx * W / 2 - (sx < 0 ? 0 : 70), -35, 119, sx * W / 2 + (sx < 0 ? 70 : 0), 35, railZ + 80).color(wood));
r.part('rail', blk(-W / 2, -50, railZ, W / 2, 50, railZ + 70).color(wood));

for (let i = 0; i < nSlots; i++) {
  const x = -((nSlots - 1) * pitch) / 2 + i * pitch;
  if (i < ns) {
    // Sword point-down in the base slot, hilt above the rail.
    const bladeTop = railZ + 40;
    r.part(`sword-${i + 1}-blade`, extrudePolygon([[x, 60], [x + 30, 140], [x + 30, bladeTop], [x - 30, bladeTop], [x - 30, 140]], 10).rotateX(90).translate(0, 5, 0).color(steel));
    r.part(`sword-${i + 1}-hilt`, blk(x - 90, -20, bladeTop, x + 90, 20, bladeTop + 30)
      .union(blk(x - 16, -16, bladeTop + 29, x + 16, 16, bladeTop + 170))
      .union(blk(x - 26, -26, bladeTop + 169, x + 26, 26, bladeTop + 215))
      .color(grip));
  } else {
    // Spear: tall shaft standing in the base, leaf-shaped steel head.
    const top = 2000;
    r.part(`spear-${i + 1}-shaft`, blk(x - 16, -16, 60, x + 16, 16, top).color(grip));
    r.part(`spear-${i + 1}-head`, extrudePolygon([[x - 16, top - 20], [x + 16, top - 20], [x + 45, top + 90], [x, top + 300], [x - 45, top + 90]], 14).rotateX(90).translate(0, 7, 0).color(steel));
  }
}
if (shield.value === 'yes') {
  // Round shield leaning against the right post, boss in the middle.
  let p = path().moveTo(330, 0);
  for (let k = 1; k < 10; k++) p = p.lineTo(330 * Math.cos((2 * Math.PI * k) / 10), 330 * Math.sin((2 * Math.PI * k) / 10));
  const disc = p.close().extrude(30).rotateZ(18).rotateY(90).rotateY(-12);
  r.part('shield', disc.translate(W / 2 + 120, 0, 330 * Math.cos(Math.PI / 10) * Math.cos((12 * Math.PI) / 180) + 8).color(shieldC));
  r.part('shield-boss', box(40, 110, 110, true).rotateY(-12).translate(W / 2 + 155 + 330 * Math.cos(Math.PI / 10) * Math.sin((12 * Math.PI) / 180) - 10, 0, 330 * Math.cos(Math.PI / 10) * Math.cos((12 * Math.PI) / 180) + 8).color(steel));
}

return r.model();
