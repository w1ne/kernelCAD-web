# cqe-task-assemble-m3-through-bracket

Build a 40 mm × 20 mm × 3 mm bracket with two M3 through-holes spaced 20 mm
apart on the top face, then attach an M3 × 10 mm socket head cap screw
through the LEFT hole (the hole at `u = -10` mm). The bolt's head-bearing
surface must mate against the bracket's top face at the chosen hole
position. Return the assembled `arm.model()`.

## Required catalog calls

- `lib.standard.boltSHCS({ thread: 'M3', lengthMm: 10 })` for the bolt.

## Required mate

- `bolt.head-bearing` mated to `bracket.bolt-holes-1` with kind `'fastened'`.

The `bolt-holes-1` connector on the bracket is auto-emitted by the holes
feature; you do NOT author it explicitly. The leftmost hole (lowest u)
is numbered `bolt-holes-1` after the deterministic (u, v) sort.
