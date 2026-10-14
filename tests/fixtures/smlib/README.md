# SMLib guard regression evidence

Source: supplied `.scratch/results.jsonl`, `.scratch/ROOTCAUSE.md`, `.scratch/repro/`,
recorded 2026-10-14. Measurements are mm³; healthy-volumes.json retains exactly
20 successful SMLib/OCCT runtime pairs (10 Node, 10 Chrome), excluding failed
builds and the two known bugs. These fixtures replay measurements; CI does not
claim to rerun Chrome or all gear builds.

ring-selfx.json retains the original 60-tooth, module 1.75, 1200-vertex profile
from the prototype's selfxPts; generated deterministically from its involute
formula. gt2-raw.step is the original legacy OCCT export, never normalized.
Live WASM tests reproduce its import loss and the four-point bowtie cut no-op;
the guarded importer normalizes input and rejects the subsequent export drift.
No instrumented kernel or native source patches are used in CI.
