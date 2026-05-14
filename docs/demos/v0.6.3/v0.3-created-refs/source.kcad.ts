// v0.3 created-refs hero — `thruHole.wall` survives a fillet chain.
//
// Build:
//   1. 100×60×20 mm block.
//   2. Drill a 6 mm through-hole at (0, 0); name it `thruHole`.
//   3. Fillet `thruHole.entry-rim` at 0.3 mm.
//   4. Fillet the body's outer top edges at 1.0 mm.
//   5. Fillet `thruHole.wall` at 0.2 mm — the bore's cylindrical wall, addressed
//      by created face ref. The resolver finds the wall through three rounds
//      of downstream topology rewrites because each upstream lineage entry
//      carries `snapshotAtCreate` + `surfaceType`.

const block = box(100, 60, 20)
  .hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thruHole' });
return block
  .fillet(0.3, { face: 'thruHole.entry-rim' })
  .fillet(1.0, { face: 'top' })
  .fillet(0.2, { face: 'thruHole.wall' });
