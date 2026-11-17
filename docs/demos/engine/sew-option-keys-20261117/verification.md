# Verification

- `npx tsx docs/demos/engine/sew-option-keys-20261117/demo.ts` — local capture repro passed; the typo returned `feature.invalid-args`, added no feature record, and the corrected option was retained.
- `npx vitest run tests/unit/intent/surfaceSew.test.ts` — 15 tests passed.
- The demo exercises the in-process capture API only. It does not lower geometry through OCCT, run a simulation, test deployed behavior, or establish hardware acceptance.
