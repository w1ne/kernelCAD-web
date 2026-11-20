# Plain math on params: fast and universal

Inside a script, `param()` values now work in plain JS math: `w + 4`, `w / 2`,
`Math.tan(a * Math.PI / 180)`, loops and point lists. An edit to such a
param rewrites its default in the source, re-runs the script (plain
JavaScript, milliseconds) and rebuilds only the features whose inputs
changed. The previous build's shapes are reused for everything else.

## Reproduce

```bash
npx tsx docs/demos/params-plain-math/bench.ts > docs/demos/params-plain-math/bench-output.jsonl
# renders: kernelcad render docs/demos/params-plain-math/tab-<30|45|60>.kcad.ts --preset publish -o verification/render-<v>.png
python3 docs/demos/params-plain-math/render_demo.py
```

## Evidence (`bench-output.jsonl`, this machine)

| Step | Time | Re-lowered / reused | Tab height |
|---|---:|---|---:|
| First build (52 features) | 3140 ms | — | 15.547 mm |
| `tabAngle` 30 → 45 | 204 ms | 2 / 50 | 24 mm (tan 45°·20 + 4) |
| `tabAngle` 45 → 60 | 152 ms | 2 / 50 | 38.641 mm (tan 60°·20 + 4) |
| Full rebuild at 60 | 2226 ms | 52 / 0 | — |

`demo.mp4` (16 s) shows the code, the three renders and these numbers.
`verification/frame-*.png` are the inspected slides. This is a local core run.
Production Studio latency depends on the server and app picking up this
kernel version.
