# shopcheck-bracket-preflight

Build an L-bracket flat-pattern in 0.125 in 6061-T6 aluminum with one
90 degree fold. Add the part as a closed sketch + sheetMetal()+.bend(),
size 80 x 40 mm with the bend at x=40, and an inner bend radius of 3 mm.
The part must pass shop preflight against the configured vendor with
zero error findings.

Return the bracket Shape from your `.kcad.ts` script.

Gates:
- `dfm_preflight({ vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125, service: 'bending' })`
  returns `ok: true`.
- Zero `dfm.*` error findings.
- At least one `flatten_pattern` + `get_bend_table` row each.
