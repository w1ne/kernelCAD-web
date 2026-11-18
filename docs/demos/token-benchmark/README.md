# Catalogue token benchmark demo

This short video records the real CLI measurement and its source counts. It demonstrates text-token measurement only; it does not validate generated geometry or imply simulation, deployment, or hardware acceptance.

- Video: [demo.mp4](./demo.mp4)
- Input: [the exact measured output](../../benchmarks/token-efficiency/output.json)
- Generator source: [generate.mjs](./generate.mjs)
- Settings: [settings.json](./settings.json)
- Visual review: [decoded contact sheet](./video-review/contact-sheet.png)
- Verification evidence: [verification.json](./verification.json)

Rebuild it from the repository root with:

```bash
node docs/demos/token-benchmark/generate.mjs
```

The generator creates its intermediate SVG and PNG slides in `generated/`, renders the H.264 MP4, then decodes selected frames into the contact sheet. The intermediate directory is reproducible and is not needed to replay the benchmark itself.
