# shopcheck-repair-loop

Start with the broken bracket below; preflight identifies that the bend
radius is below the vendor minimum for the selected material + thickness.
Read the `repairHint.action` and `measured.ref` from the failing finding
and apply the suggested repair (`enlarge` the radius), then re-run
preflight and assert it now passes.

```ts
const s = path().moveTo(0, 0).lineTo(60, 0).lineTo(60, 30).lineTo(0, 30).close();
const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
return blank.bend({ atX: 30 }, 90, 1); // radius 1 mm < vendor min 2.39 mm
```

Gate:
- The repaired build returns `ok: true` from `verify({ check: 'dfm-preflight' })` with
  `{ vendor: 'sendcutsend', material: 'aluminum-6061-t6', thicknessIn: 0.125, service: 'bending' }`.
- The repaired bend radius is >= the `threshold.value` reported in the
  failing finding.
