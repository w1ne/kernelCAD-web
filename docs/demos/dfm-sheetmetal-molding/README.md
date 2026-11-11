# `dfm_review`: structured outcomes on real fixtures

This bundle records local validation of the `dfm_review` result contract on
the bent bracket and molded tray fixtures beside this file. It demonstrates
three aggregate outcomes: `fail` for a checked failure, `not-checked` when a
requested process does not apply, and `pass` for a completed review with no
failing or incomplete row. Evaluated warnings remain `warn` rows.

[`demo.mp4`](demo.mp4) (32 s, 1280×720) shows six actual `dfm_review` calls,
their model views and structured rows. The calls cover a failing molded tray,
a drafted tray with an evaluated warning, failing and passing bent brackets,
a requested sheet-metal review on a regular solid, and an FDM row whose area
unit stays separate from its angular setting. [`result.json`](result.json)
retains the exact invocations and outputs; it also records a same-fixture
`resolveTopoRefTool` round-trip for every emitted topology reference. On-frame
summaries use `…` when truncated and show the comparison tolerance when one is
used. [`report.ts`](report.ts),
[`compose.py`](compose.py), the `.kcad.ts` fixtures, the
`viewport-source-*.png` files and current `still-*.png` frames retain the
reproducible source and visual evidence.

The normalized rows keep `id` as the rule key and include `source`, the
KernelCAD process engine that produced the row. Numeric `unit` and `op` appear
when `value` and `limit` are comparable. Optional `tolerance` is the inclusive
allowance used by that comparison, in the same unit; when absent it is zero.
For `>=`, pass when `value + tolerance >= limit`; for `<=`, pass when
`value - tolerance <= limit`. Unsupported FDM area is reported in `mm2`
without attaching a degree limit. Face refs are optional and are omitted when
unique resolvable lineage is unavailable. The tray runs emitted no refs; the
result records `no-refs-emitted` for its verification status instead of
inventing names.

`ok` reports invocation, model evaluation and analysis execution. It is not a
manufacturing pass indicator: a completed review with a failing check can
return `ok: true`. A call or model-evaluation error returns `ok: false` and
omits the manufacturing `verdict`. A completed but incomplete review may
return `ok: true` with `verdict: 'not-checked'`.

## Reproduce

```sh
npx tsx docs/demos/dfm-sheetmetal-molding/report.ts
python3 -I docs/demos/dfm-sheetmetal-molding/compose.py docs/demos/dfm-sheetmetal-molding
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of default=noprint_wrappers=1 docs/demos/dfm-sheetmetal-molding/demo.mp4
```

The viewport crops in this bundle reuse retained local render-inspection
views for these unchanged fixtures; `report.ts` reruns all six tool calls,
serializes optional references without null placeholders, and resolves every
emitted reference against the same fixture used by that call. `compose.py`
regenerates the video, frame list, and four `still-*.png` review frames from
the current results. The handler run is local validation on this machine.
The video does not show hosted behavior, a mold-flow or press-brake simulation,
or a fabricated part. It is verification evidence for this contract change,
not a manufacturing acceptance result.
