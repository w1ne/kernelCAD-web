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
retains the exact invocations and outputs; [`report.ts`](report.ts),
[`compose.py`](compose.py), the `.kcad.ts` fixtures, the
`viewport-source-*.png` files and current `still-*.png` frames retain the
reproducible source and visual evidence.

The normalized rows keep `id` as the rule key and include `source`, the
KernelCAD process engine that produced the row. Numeric `unit` and `op` appear
when `value` and `limit` are comparable. For example, unsupported FDM area is
reported in `mm2` without attaching a degree limit. `refs` contains only
existing `@kc[...]` topology references emitted by an analysis engine; the
molding face refs shown here resolve with `resolve_topo_ref`.

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
stills for these unchanged fixtures; `report.ts` reruns all six tool calls to
create the displayed result rows. The handler run is local validation on this machine.
The video does not show hosted behavior, a mold-flow or press-brake simulation,
or a fabricated part. It is verification evidence for this contract change,
not a manufacturing acceptance result.
