// A selector that an edit silently re-binds to another face.
//
// The fillet asks for "an up-facing face of 700..900 mm^2". At w = 30 that is
// the plate's top (800 mm^2). Widen the plate to w = 50 and the plate top has
// grown to 1200 mm^2, so the same selector now matches the boss top (also
// 800 mm^2): the model still builds, but the fillet is on the wrong face.
//
// Every evaluation records what each selector bound to (`selections` in the
// JSON). Hand that record back as the baseline after an edit:
//
//   npx tsx src/agent/cli/index.ts evaluate examples/selector-binding-drift.kcad.ts --json > before.json
//   sed 's/"w", 30/"w", 50/' examples/selector-binding-drift.kcad.ts > wide.kcad.ts
//   npx tsx src/agent/cli/index.ts evaluate wide.kcad.ts --baseline before.json
//     -> WARN [selector.binding-changed] ... was PLANE face 'top' of box_1 ..., now PLANE face 'top' of box_2 ...
//
//   sed 's/"w", 30/"w", 34/' examples/selector-binding-drift.kcad.ts > wider.kcad.ts
//   npx tsx src/agent/cli/index.ts evaluate wider.kcad.ts --baseline before.json
//     -> INFO [selector.binding-moved] ... area 800 -> 880 (same face, resized)
//
// `evaluate_script` and `set_param` do this on their own when they re-evaluate
// the file (or code) they evaluated last.

const w = param("w", 30, { min: 20, max: 60 });
const plate = box(w, 40, 6);
const boss = box(w.subtract(10), 20, 10).translate(5, 10, 6);

return plate.union(boss).fillet(1, { face: { byNormal: 'Z', minArea: 700, maxArea: 900 } });
