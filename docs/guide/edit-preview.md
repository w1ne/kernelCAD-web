# Preview a parameter edit against intent

`set_param({ ..., preview: true })` answers "what will this edit change?"
before the caller writes the returned source. It builds the current source and
the revised source in scratch sessions and returns three linked reports:

- `geometry` — the same material diff as `diff_geometry`: per matched body
  `addedMm3`, `removedMm3`, `commonMm3`, bbox / face / edge / hole deltas, a
  surface deviation, and a verdict (`identical`, `moved`, `resized`,
  `topology-changed`). `geometry.summary` is the one-line totals block.
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
