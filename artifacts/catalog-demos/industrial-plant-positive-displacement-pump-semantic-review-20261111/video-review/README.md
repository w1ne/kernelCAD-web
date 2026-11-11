# MP4 inspection

Inspected the encoded video and five decoded frames from the before and after scenes.

- `video-inspection.json`: ffprobe metadata — H.264, 720×640, 24 fps, yuv420p, 12 seconds.
- `frame-01.png` and `frame-02.png`: the original local render and its caption; the pump reads as a motor attached to a plain block.
- `frame-03.png` through `frame-05.png`: the revised local render; the separate dark-green motor, guarded coupling, bolted circular pump cover, two raised ports and relief return are visible. The bottom caption remains legible and identifies the branch as not deployed.

The decoded frames were produced with:

```bash
ffmpeg -hide_banner -y -i artifacts/catalog-demos/industrial-plant-positive-displacement-pump-semantic-review-20261111/demo.mp4 \
  -vf "select='eq(n,12)+eq(n,72)+eq(n,155)+eq(n,215)+eq(n,287)'" \
  -fps_mode passthrough artifacts/catalog-demos/industrial-plant-positive-displacement-pump-semantic-review-20261111/video-review/frame-%02d.png
```
