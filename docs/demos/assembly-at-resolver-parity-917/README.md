# Assembly placement resolver parity

This bundle reproduces a scoped #917 lowerer input mismatch. It compares the
normal recompute path with a caller that supplies `resolveRecord` but omits the
separate `paramTable` for the final assembly record. The model has a
parameter-positioned mount, a parameter-positioned valve, and a fastened mate.
The mate connector frames and the part geometry must resolve each authored
`at:` value consistently.

## Reproduce

From the repository root, with dependencies and `ffmpeg`/`ffprobe` installed:

```sh
npx vitest run tests/integration/lowering/mateAtPlacement.test.ts -t 'record resolver' --reporter=dot
npx tsx docs/demos/assembly-at-resolver-parity-917/capture-demo.mts
```

The resolver-only regression failed before the source fix in both `model()` and
`solvedModel()`: the valve was displaced 100 mm because the part's `at:` was
not included in its connector frame. Both cases pass after the fix. The video
shows exact BREP bounding boxes from the local recompute result, including a
parameter edit; it is a local geometry check, not a physics simulation,
deployed behavior, or hardware acceptance.

`verification.json` records measured bounds, invocation, source hash, and
video settings. `settings.json` keeps the capture configuration beside the
fixture and script.
