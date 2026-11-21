// NEMA 17 motor mount plate, 60 × 60 × 6 mm. Four Ø3.4 clearance holes on the
// 31 mm bolt square and a Ø22.5 pilot bore for the motor boss, all through.
// R5 outside corners. The entry rims (top, under the screw heads) get a
// 0.5 mm deburr; a second, later chamfer breaks the exit rims (against the
// motor face) by 0.3 mm. Both rim sets are picked by their created edge label.
const stock = box(60, 60, 6);
const plate = stock
  .fillet(5, kc.q.edge(kc.q.createdBy(stock.id)).and(kc.q.withLabel('corner')))
  .hole('top', { u: 0, v: 0, diameter: 22.5, depth: 'through', name: 'pilot' })
  .holes('top', {
    positions: [{ u: -15.5, v: -15.5 }, { u: 15.5, v: -15.5 }, { u: 15.5, v: 15.5 }, { u: -15.5, v: 15.5 }],
    diameter: 3.4,
    depth: 'through',
    name: 'screws',
  });
const rims = (label: string) => kc.q.edge(kc.q.derivedFrom(plate.id)).and(kc.q.withLabel(label));
return plate.chamfer(0.5, rims('entry-rim')).chamfer(0.3, rims('exit-rim'));
