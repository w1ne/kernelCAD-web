// 30 × 6 mm rectangle, centered on (0, 0) in face-local 2D.
const slot = path()
  .moveTo(-15, -3)
  .lineTo( 15, -3)
  .lineTo( 15,  3)
  .lineTo(-15,  3)
  .close();

return box(60, 40, 6)
  .cutout(slot, { face: 'top', depth: 'through' })
  .fillet(0.5, { face: 'wall' });
