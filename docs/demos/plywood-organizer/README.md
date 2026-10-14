# Plywood organizer digital review

The 20-second `demo.mp4` is an annotated still sequence from actual hosted MCP isometric/top renders and source-derived cutting/coupon diagrams. It is not a UI recording, turntable, physical cut or hardware acceptance.

Source: `examples/plywood-organizer/organizer.kcad.ts`.

Hosted evaluation and nominal contours: `site/blog/plywood-organizer-laser-workflow/`.

Run the example verifier and contour generator from the repository root:

```sh
npx tsx examples/plywood-organizer/verify.mts
python3 examples/plywood-organizer/generate-cut-layout.py
```

To reproduce the review video on macOS with Pillow, Arial and ffmpeg installed:

```sh
python3 docs/demos/plywood-organizer/make-review-video.py
```

The script generates `workflow-review.mp4`; copy that result to `demo.mp4` after visual inspection and update the video receipt. The retained images are the actual video inputs. `video-evidence.json` identifies the source and delivered video hashes. Physical measurements, laser settings, cutting and assembly remain pending.
