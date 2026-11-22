// NEMA 17 motor mount plate, 60 × 60 × 6 mm. Four Ø3.4 clearance holes on the
// 31 mm bolt square and a Ø22.5 pilot bore for the motor boss, all through.
// The entry rims (top face, where the screw heads sit) get a 0.5 mm deburr
// chamfer by created edge ref; the exit rims stay sharp against the motor.
const plate = box(60, 60, 6)
  .hole('top', { u: 0, v: 0, diameter: 22.5, depth: 'through', name: 'pilot' })
  .holes('top', {
    positions: [{ u: -15.5, v: -15.5 }, { u: 15.5, v: -15.5 }, { u: 15.5, v: 15.5 }, { u: -15.5, v: 15.5 }],
    diameter: 3.4,
    depth: 'through',
    name: 'screws',
  });
// One chamfer for every entry rim: a later fillet or chamfer does not keep
// the rim labels of edges it leaves alone, so break them all in one feature.
return plate.chamfer(0.5, kc.q.edge(kc.q.derivedFrom(plate.id)).and(kc.q.withLabel('entry-rim')));
