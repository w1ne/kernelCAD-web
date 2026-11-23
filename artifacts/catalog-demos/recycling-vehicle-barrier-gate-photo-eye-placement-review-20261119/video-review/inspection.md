# MP4 visual inspection

- Probe: H.264, 1280 × 720, 24 fps, 20.00 seconds; full output is in `ffprobe.json`.
- Opened a contact sheet of frames extracted at 2, 6, 10 and 14 seconds. `inspect_video.py` regenerates these frames; they are not retained in the bundle.
- The first frame shows the five named rendered assets and marks the selected barrier gate. The second frame shows the before state (two orange posts with black heads in the lane under the boom) beside the after state (one post beside the cabinet, one beside the rest post, lane clear). The third frame is a top-view plan of the posts, lane and beam before and after, with the dimensions. The last frame shows the local verification and limits claims to source, software preview and GLB regression.
- Headings, part labels and captions are legible at full video resolution; no visible text clipping. The asset thumbnails on the first frame are small; the caption names the selected defect. The closing frame states the branch is not deployed and makes no simulation, safety or compliance claim.
