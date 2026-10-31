# Array-return multi-body demo

`demo.mp4` shows the actual local build result for `return [bracket, pin]`: the
capture path creates a named `SceneBackend`, and both lowered solids produce
display meshes. The clip is a local replay of build/mesh evidence, not a live
deployed UI, hardware acceptance, or export acceptance claim.

[Watch the six-second demo](demo.mp4) · [view its frame](demo.png).

## Reproduce

```sh
TMPDIR=/Volumes/LabWired/kc-work/tmp TMP=/Volumes/LabWired/kc-work/tmp \
  node --import tsx docs/demos/array-return/build-demo.ts
rsvg-convert -o docs/demos/array-return/demo.png docs/demos/array-return/demo.svg
ffmpeg -y -loop 1 -i docs/demos/array-return/demo.png -t 6 -r 24 \
  -pix_fmt yuv420p docs/demos/array-return/demo.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 \
  docs/demos/array-return/demo.mp4
```

`return-multipart.kcad.ts` is the model source, `build-demo.ts` builds and meshes
it, and `verification.json` retains the exact body names, volumes, bounds and
root kind from that run. `demo.svg` is the retained visual source for the MP4.
