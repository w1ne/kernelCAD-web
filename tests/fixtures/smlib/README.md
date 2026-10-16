# SMLib guard regression evidence

Source: supplied `.scratch/results.jsonl`, `.scratch/ROOTCAUSE.md`, `.scratch/repro/`,
recorded 2026-10-14. Measurements are mm³; healthy-volumes.json retains exactly
20 successful SMLib/OCCT runtime pairs (10 Node, 10 Chrome), excluding failed
builds and the two known bugs. These fixtures replay measurements; CI does not
claim to rerun Chrome or all gear builds.

ring-selfx.json retains the original 60-tooth, module 1.75, 1200-vertex profile
from the prototype's selfxPts; generated deterministically from its involute
formula. gt2-raw.step is the original legacy OCCT export, never normalized.
The 0.3.1 WASM rerun preserves the full GT2 STEP volume (1613.939256648 mm³)
and 49 faces, while the one-face torus repro still collapses its area during
seam repair. The four-point bowtie cut remains a valid, unchanged cylinder.
The registry keeps its import invariant for the remaining seam-repair failure.
No instrumented kernel or native source patches are used in CI.
