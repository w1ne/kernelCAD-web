# Video inspection — 18 November 2026

The retained source `make_demo.py` generated the eight-slide MP4 from the five
catalog preview PNGs, the retained before/after spreader PNGs, and
`summary.json`. The exact canvas, slide duration, rate and codec settings are
in `../demo-settings.json`; all eight source slides are in `frames/`.

Reproduction from the repository root:

```sh
python3 artifacts/catalog-demos/shipyard-hull-block-spreader-beam-elastomer-pad-material-review-20261118/make_demo.py
```

The video was decoded and inspected as an eight-frame contact sheet at
`video-contact-sheet.png`. The cover identifies the five-item audit and the
one material correction. Four review slides show each other asset and preserve
the push-bar and cage-mesh follow-up observations. The before/after slide
shows all four contact pads changing from the shared painted color to a dark
elastomer finish. The final slide reports the baseline-failing and revised
GLB regression, the 380-triangle unchanged mesh, the full integration result,
the shipyard quality result, and the separate global gate result.

The first inspection caught a clipped pipe-rack envelope line. The slide
source was changed to wrap the dimensions; the regenerated MP4 and final
contact sheet were checked again, and the full envelope now fits on two lines.

`video-probe.json` confirms H.264, 1280×720, 12 fps, yuv420p, 24 seconds, and
324,560 bytes. `video-sha256.txt` records the MP4 hash. Captions state that
this is a local software preview and regression review; no simulation,
deployment, rated lifting capacity, or hardware acceptance is claimed.
