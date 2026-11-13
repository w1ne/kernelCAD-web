# Portfolio watches evaluate again (2026-11-13)

`examples/portfolio/pocket-watch/build.kcad.ts` and
`examples/portfolio/watch-from-screenshot-agent-loop-v2.kcad.ts` failed on
develop with `TypeError: watch.fixed is not a function`. Both now evaluate
cleanly and are covered by `tests/integration/fast/exampleParseSmoke.test.ts`.

`demo.mp4` is a static local turntable of the pocket watch. It shows geometry
only; the evaluate and validate results come from the CLI. Provenance and hashes
are in `capture-settings.json`. Re-caption with `render-demo.sh`.

## Local verification

On 2026-11-13, the focused example smoke run passed (10 passed, 250 skipped):

```sh
npx vitest run tests/integration/fast/exampleParseSmoke.test.ts -t 'examples/portfolio/pocket-watch|examples/portfolio/watch-from-screenshot-agent-loop-v2|examples/print-prep/wall-hook'
```

This covered parse/transpile for the selected examples, clean evaluation of all
three portfolio watches, and the wall-hook's expected
`dfm.fdm.overhang-unsupported` result (`938.2 mm²`, `'+z'` up). ESLint also
passed on the two changed watch scripts and the smoke test. These are local
software checks; the MP4 is a static geometry turntable, not a simulation or
hardware result.

Limit: the wristwatch (`watch-from-screenshot-agent-loop-v2`) evaluates, but
`validate` still reports pre-existing mate gaps and part interferences. It is
not shown here.
