# Parameter driven placement warning

This bundle reproduces the missing `assembly.placement-ignored-by-mate-fk`
diagnostic for a mate-positioned part whose `at:` uses a script parameter.
The example declares `offset = 125 mm`; the warning now reports that resolved
value instead of treating the captured `ParamRef` as zero.

## Reproduce

From the repository root, with dependencies and `ffmpeg`/`ffprobe` installed:

```sh
npx vitest run tests/unit/assemblies/placementIgnoredByMateFk.test.ts --reporter=dot
npx tsx docs/demos/param-placement-note-at-917/capture-demo.mts
```

The focused test failed before the fix: 6 tests passed and the new parameter
case found no placement warning. After the fix, all 7 tests pass. The capture
script builds the included `.kcad.ts` model, records the actual diagnostic,
and renders the workflow and result into `demo.mp4`.

`verification.json` records the invocation, diagnostic, model source, and
video settings. The MP4 is a local compiler-diagnostic demonstration; no
physics integration, deployment, or hardware acceptance is claimed.
