# Video inspection

`demo.mp4` was decoded with ffmpeg and inspected at 0, 6 and 10 seconds (`frame-01.png`, `frame-04.png`, `frame-06.png`). The opening frame clearly shows the gold heads and nozzle necks against the gray shell. The changeover at six seconds is legible; the after frames show the heads and nozzle necks in the shell's steel color while the yellow support frame remains. Captions identify this as a local source render on an undeployed branch.

`video-inspection.json` records the decoded stream: H.264, 720×640, 24 fps, 288 frames, 12 seconds. The source invocation and encoding settings are retained in `../build-demo.sh` and `../demo-settings.json`.
