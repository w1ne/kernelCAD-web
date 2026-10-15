# K8 sketch part detection demo

This bundle demonstrates local replay of `trace_from_image({ detectParts: true })` with a mocked vision response. It is not a live model call, a deployed behavior check, or hardware acceptance.

## Reproduce

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsx docs/demos/k8-sketch-part-detection/capture.ts
```

The response fixture is [argon-grow-parts-response.json](../../../tests/fixtures/vision/argon-grow-parts-response.json), derived from the [drawbot handoff](../../../tests/fixtures/argon/handoff-drawbot.json) (`labwired-kernelcad-handoff/0.1`). The script writes `result.json`, a generated sketch image, a result frame, and `demo.mp4` beside itself. The vision response is mocked; only image decode, trace orchestration, bundled-catalog matching and coordinate/BOM post-processing run locally.

## Scope

The video illustrates the existing outline beside detected labeled boxes and a draft BOM. Positions are normalized to the outline bounds. Bundled-catalog matches are candidates only; unmatched labels stay visible for review. The video is local replay evidence, not deployed behavior or hardware acceptance.
