// DELIBERATELY BROKEN — repair fixture for `examples/repair/run-repair-example.ts`.
//
// A 40 mm plate with a centred Ø20 through-hole, then an engrave anchored
// at the face centre — the glyphs sit in the void. Lowering emits
// `feature.emboss-text.boolean-noop` (error) because the cut changed no volume.
//
// The repair loop slides the UV anchor to (0.2, 0.2), onto remaining solid.
//
// Run the repair walkthrough:
//   npx tsx examples/repair/run-repair-example.ts examples/repair/emboss-over-hole.kcad.ts
return box(40, 40, 6).hole('top', { u: 0, v: 0, diameter: 20, depth: 'through' })
  .embossText({ textContent: 'HI', face: 'top', size: 4, depth: -0.5, anchorU: 0.5, anchorV: 0.5 });
