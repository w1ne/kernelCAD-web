# Preview a parameter edit against intent

`set_param({ ..., preview: true })` answers "what will this edit change?"
before the caller writes the returned source. It builds the current source and
the revised source in scratch sessions and returns three linked reports:

- `geometry` — the same material diff as `diff_geometry`: per matched body
  `addedMm3`, `removedMm3`, `commonMm3`, bbox / face / edge / hole deltas, a
  surface deviation, and a verdict (`identical`, `moved`, `resized`,
  `topology-changed`). Each body's `faces` lists which faces were added,
  removed or modified (moved / resized / reshaped, with before/after area,
  centre, normal or radius and a stable `@kc[...]` ref where one exists).
  `geometry.summary` is the totals block, and `geometry.summary.text` is the
  same diff in plain language.
- `requirementsDiff` — the S2 ledger diff. Every entry pairs by source, name
  and declaring feature, then by occurrence. Each entry carries before/after
  snapshots (`status`, `measured`, `limit`, `margin`) and a margin delta. The
  top-level `flipped`, `marginsShrunk`, `added` and `removed` arrays are the
  repair signal.
- `bindings` — S1 selectors that moved (`moved`) or now point at a different
  entity (`changed`), with the old and new fingerprint, reasons and deltas.

`before` and `after` hold each side's full evaluation summary. Read
`after.requirementsOk` to decide whether the edit preserves declared intent:
`preview.ok` only says the preview could be computed, so a preview that
correctly shows a broken requirement is still `ok: true`.

```typescript
const code = `
const w = param('Width', 40, { min: 10, max: 100 });
const body = box(w, 20, 5);
require('bracket-volume', volume(body).gte(3970));
return body;
`;

set_param({ code, param_name: 'Width', new_value: 39.5, preview: true });
// requirementsDiff.flipped -> ['bracket-volume'] (pass -> fail)
// geometry.summary       -> { resized: 1, totalRemovedMm3: ~50, ... }
// after.requirementsOk   -> false
```

Nothing is written. The source argument is not mutated, the active MCP session
is not replaced, the preview never publishes a viewer or a step artifact, and
the per-session caches are untouched. A revised build that fails returns
`ok: false` with the build diagnostics and no `geometry` / `requirementsDiff`.

Preview is measurement, not a proof: it compares two builds at the values you
asked for. It does not sweep the parameter range (use `sweep_tolerance`), and
a requirement that is absent on one side appears as `added` / `removed` rather
than as a pass.

The same payload is the data contract for a before/after parameter control:
show `requirementsDiff.entries` beside the slider and use each entry's
`margin.before` / `margin.after` for the measured change.

## Edit a feature in place

A literal argument is not a `param()`, so it has no name for `set_param` to
rewrite. Feature mode edits it by feature id and returns the same diff:

```typescript
const code = `
const t = 5;
const base = box(60, 40, t);
const hole = cylinder(t + 2, 4).translate(30, 20, -1);
return base.subtract(hole).fillet(1);
`;

set_param({ code, feature: 'cylinder_1', changes: { r: 3.3 } });
// new_code       -> ... cylinder(t + 2, 3.3) ...   (only that argument changed)
// edits          -> [{ param: 'r', before: 4, after: 3.3, sourceBefore: '4', sourceAfter: '3.3', line: 4 }]
// changedParams  -> [{ feature: 'cylinder_1', param: 'r', before: 4, after: 3.3 }]
// geometry       -> resized; material added back where the hole shrank
```

`inspect({ of: 'features' })` lists feature ids and their parameter names. The
argument is found from the feature's recorded call site: a property of an
options object with the parameter's name, else the positional argument at the
parameter's index. Each rewrite is kept only when capturing the edited script
shows the feature at the requested value with its other parameters unchanged,
so a wrong guess never comes back as an edit. `changedParams` lists every
feature parameter that moved, which shows a call site shared by a loop or a
helper. A value driven by `param()` is refused (`feature.edit.param-driven`)
with a hint to `set_param` that param, because editing it here would detach it.
