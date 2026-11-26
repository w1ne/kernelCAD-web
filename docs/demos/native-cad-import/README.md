# Import a native SolidWorks part into a validated B-rep

[demo.mp4](./demo.mp4) shows the local CLI workflow and the imported NIST
FTC-06 part. The handoff is geometry-only: SolidWorks feature history, PMI,
and assembly relations do not carry through the STEP B-rep conversion.

## Replay and evidence

- Authoring source: [`nist-ftc-06.kcad.ts`](./nist-ftc-06.kcad.ts)
- Native and STEP fixtures with provenance: [`tests/fixtures/native-cad-import/README.md`](../../../tests/fixtures/native-cad-import/README.md)
- Capture invocation: `KERNELCAD_CADMPEG_BIN=/path/to/cadmpeg node --import tsx docs/demos/native-cad-import/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/native-cad-import/make-video.mts`
- Local CLI/API results and fixture hashes: [`evidence.json`](./evidence.json)
- Video settings, checksum, and render provenance: [`video-evidence.json`](./video-evidence.json)
- Verification commands and results: [`verification.json`](./verification.json)
- Preview: [`poster.png`](./poster.png)

The measured NIST part produced one valid closed solid. Against NIST's STEP
geometry twin, volume differs by 11.150330 mm³ on a 3,323,557.221135 mm³
reference, and the maximum bound difference is 0.000003 mm. The CLI manifest
contains the original `.sldprt` SHA-256 and reports cadmpeg 0.6.12.

The MP4 paints the validated OCCT tessellation with a deterministic software
projection. Capturing through the Studio viewport was attempted against the
already-running Chrome sessions at CDP ports 9222 and 9223; Playwright attached
to each but timed out before capture. No additional browser was launched. The
video is therefore a local geometry visualization, not a Studio or hosted
render.

This evidence records local API/CLI/MCP evaluation and model validity only. It
does not establish deployed behavior, simulation results, or hardware
acceptance. One NIST FTC-06 document does not qualify every SolidWorks document
or version.
