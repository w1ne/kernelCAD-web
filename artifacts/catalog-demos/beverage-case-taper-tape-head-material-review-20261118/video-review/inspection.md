# Encoded demo inspection

The final MP4 was checked after encoding at 1280×720, H.264, yuv420p, 24 fps and 18 seconds. Frame samples were extracted from the encoded video at 2, 5, 9, 13 and 16 seconds and visually inspected.

| Time | Frame | Review |
|---:|---|---|
| 2 s | `frame-02s.png` | Five preview cards and labels are legible; all five local models fit their cards. |
| 5 s | `frame-05s.png` | Baseline teal tape head and tan roll are visible; mismatch explanation fits without clipping. |
| 9 s | `frame-09s.png` | Before/after component mappings are readable; unchanged-geometry note is visible. |
| 13 s | `frame-13s.png` | Corrected gray metal head and tan roll are distinct; caption says “metal finish” and clarifies this is local preview evidence. |
| 16 s | `frame-16s.png` | Focused regression, lint, kit/global quality gate, integration suite and index evidence fit; footer distinguishes local software checks from deployment, process simulation and hardware acceptance. |

No clipped captions, overlaps, or unreadable result details were found in the sampled frames. The frame PNGs are retained here as review evidence. Container properties are recorded in `../verification/video-probe.json`.
