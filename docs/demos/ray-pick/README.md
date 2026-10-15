# `ray_pick` demonstration bundle

This bundle records a local invocation of the `ray_pick` MCP handler on a 10 mm
box. The returned hit distances, face IDs, points, and normals are shown in the
MP4 and retained in `result.json`; `demo.ts` is the invocation and SVG source.
View the [five-second demonstration](demo.mp4).

## Reproduce

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsx docs/demos/ray-pick/demo.ts
rsvg-convert -o docs/demos/ray-pick/demo.png docs/demos/ray-pick/demo.svg
ffmpeg -y -loop 1 -i docs/demos/ray-pick/demo.png -t 5 -r 24 -pix_fmt yuv420p docs/demos/ray-pick/demo.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 docs/demos/ray-pick/demo.mp4
```

This demonstrates local tool behavior over the viewer's face tessellation. It
does not establish deployed behavior or hardware acceptance.
