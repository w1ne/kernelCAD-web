// Direct-edit hero: the slider starts overlapping the base (1 interference
// pair); drag it in +X until the HUD goes to 0, then accept the diff.
//
// The slider's local transform is `.translate(PX, 0, PYZ)` on its `param()`
// values, so the direct-edit planner rewrites the PX declaration in place
// (X:param · Y:literal · Z:param) rather than appending a delta wrapper.
//
// Both boxes are centered on their local frame: the base spans z ∈ [-3, 3]
// and the slider (PYZ=6 default) spans z ∈ [1, 11], so the pair genuinely
// clashes by 20 × 20 × 2 = 800 mm³ at PX=20. A +30 mm drag in X moves the
// slider to x ∈ [40, 60], fully clear of the base's x ∈ [-30, 30] face.
//
// Render an inspection bundle:
//   npx tsx src/agent/cli/index.ts render inspect \
//     examples/direct-edit-drag-to-clearance.kcad.ts docs/demos/direct-edit/after

const PX = param('PX', 20, { min: 0, max: 60 });
const PYZ = param('PYZ', 6, { min: 4, max: 12 });

const demo = assembly('direct-edit drag to clearance');
demo.part('base', box(60, 40, 6, true));
demo.part('slider', box(20, 20, 10, true).translate(PX, 0, PYZ));

return demo.model();
