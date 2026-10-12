# Rocket engine routing film

[Play or download the silent film](demo.mp4).

The 45-second film shows the actual illustrative assembly from
[`engine-routed.kcad.ts`](../../../examples/rocket-engine-lines/engine-routed.kcad.ts),
with its original materials and all 23 authored tube geometries. It contains no
captions, titles, UI, watermark, sound, music or narration. The owner can add a
voice track separately.

| Time | Native geometry shown |
| --- | --- |
| 0–3 s | Engine hardware, all tubes hidden |
| 3–8 s | Four blue LOX lines |
| 8–14 s | Nine gold fuel lines, including coolant and actuator routes |
| 14–18 s | Two copper hot-gas lines: generator feed and free aft exhaust |
| 18–22 s | Two purple igniter lines |
| 22–28 s | Six green pneumatic lines |
| 28–44 s | Complete assembly, continuous 360° native camera orbit |
| 44–45 s | Final view held |

Each service appears as complete native geometry and remains present in later
shots. The first 28 seconds use eight native 3840 × 2160 renders with a gentle
2.8% crop push in editing. Those pushes are image editing; the final orbit uses
384 native 1920 × 1080 frames at constant 12° elevation and native
orbit-fit distance. Close-ups deliberately crop surrounding hardware while
retaining the full cumulative scene.

[Media receipt](media-receipt.json) records the source, mesh cache, player and
capture-adapter hashes, visibility, camera angles, edit settings and video
checks. Native master images and selected decoded film frames are retained in
`master-shots/` and `review-frames/` for review. The local capture used the native
bundled player through an owned tab attached to an existing Chrome session;
it did not run another browser or alter the model.

The film demonstrates CAD routing and rendering. It does not establish a
working engine, propulsion performance, pressure or temperature ratings,
manufacturing readiness, or physical acceptance.
