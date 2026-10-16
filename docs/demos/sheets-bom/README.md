# LabWired BOM writer walkthrough

[demo.mp4](demo.mp4) shows the supplied drawbot handoff merged with example
KernelCAD catalog pricing and written as CSV. It demonstrates local validation of
`write_bom` and the CSV fallback. It does not show a connected Google account,
deployed MCP behavior, or a physical build.

## Retained source and evidence

- [handoff-drawbot.json](../../../tests/fixtures/argon/handoff-drawbot.json): the
  supplied `labwired-kernelcad-handoff/0.1` drawbot fixture (7 parts).
- [handoff.fixture.json](../../../tests/fixtures/argon/handoff-drawbot.json): the
  same source fixture used by the runnable demo.
- [run-demo.mjs](run-demo.mjs): executable demonstration source and example catalog
  data. Prices/MPNs in the demo are illustrative inputs, not a vendor quote.
- [bom.csv](bom.csv) and [result.json](result.json): actual local tool output.
- [video-evidence.json](video-evidence.json): demo provenance and scope.
- [frames/](frames/) and [encode.py](encode.py): retained video source frames and
  caption/encoding script.
- [ffprobe.json](ffprobe.json): media metadata and decode verification.

## Reproduce

From the repository root with Node 22:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx tsc -b
node --import tsx docs/demos/sheets-bom/run-demo.mjs
python3 docs/demos/sheets-bom/encode.py
ffmpeg -hide_banner -loglevel error -framerate 1 -i docs/demos/sheets-bom/frames/%02d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y docs/demos/sheets-bom/demo.mp4
ffprobe -v error -show_streams -show_format -of json docs/demos/sheets-bom/demo.mp4 > docs/demos/sheets-bom/ffprobe.json
ffmpeg -hide_banner -loglevel error -i docs/demos/sheets-bom/demo.mp4 -f null -
```

The video is a captioned local result walkthrough, not a recording of Sheets or the
product UI. Google Sheets appends remain host-integration behavior and were tested
with a mocked injected client.
