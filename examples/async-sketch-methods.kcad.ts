// `Shape.sectionSketch` / `Shape.faceSketch` / `Shape.silhouette` are async
// (they lower the Shape to OCCT at capture time) and return `Promise<Sketch>`.
// Chaining a Sketch method straight onto the un-awaited call —
// `part.sectionSketch('xy', 5).extrude(3)` — used to fail with the cryptic
// `TypeError: sec.extrude is not a function`. It now fails loudly with
// `feature.async-result.missing-await`, naming the exact fix. This example
// is the CORRECT (awaited) form; `async-sketch-methods.run.ts` also proves
// the un-awaited form of each of the three methods raises that diagnostic.
//
// Run with:
//   npx tsx examples/async-sketch-methods.run.ts
//
// Expected output (see the run file):
//   section extrude volume    = 6813.584 mm^3
//   silhouette extrude volume = 2000.000 mm^3

const plate = box(60, 40, 10)
  .hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' })
  .hole('top', { u: 15, v: 0, diameter: 8, depth: 'through' });

// AWAIT the Promise<Sketch> before chaining .extrude().
const section = await plate.sectionSketch({ plane: 'xy', offset: 5 });
return section.extrude(3);
