# Portfolio watches evaluate again (2026-11-13)

`examples/portfolio/pocket-watch/build.kcad.ts` and
`examples/portfolio/watch-from-screenshot-agent-loop-v2.kcad.ts` failed on
develop with `TypeError: watch.fixed is not a function`. Both now evaluate
cleanly and are covered by `tests/integration/fast/exampleParseSmoke.test.ts`.

`demo.mp4` is a static local turntable of the pocket watch. It shows geometry
only; the evaluate and validate results come from the CLI. Provenance and hashes
are in `capture-settings.json`. Re-caption with `render-demo.sh`.

Limit: the wristwatch (`watch-from-screenshot-agent-loop-v2`) evaluates, but
`validate` still reports pre-existing mate gaps and part interferences. It is
not shown here.
