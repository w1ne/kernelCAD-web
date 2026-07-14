# Existing Photo Workflow Repair

## Status

Re-scoped on 2026-07-14 after direct reproduction showed that kernelCAD already
has a photo button, but that button is not connected to the current generated
CAD and verification path.

## Observed failure

The legacy AI Assistant uploads a data URL directly to a vision chat request,
then returns markdown. It does not retain a reference asset, run
`trace_from_image`, or enter the current agent loop. Its Apply and Preview
actions run `.kcad.ts` source through the obsolete `HeadlessKernel`, which only
injects `replicad` and `console`; ordinary `param()`-based kernelCAD source
therefore fails before the Studio runtime can evaluate it.

The active Studio surface (`StudioGenerate`) has the right staged-review and
modern-runtime path but currently accepts only text/mesh context, not a photo.

## Decision

Repair the active Studio generation path rather than revive the legacy panel.
A photo-assisted build must include:

- a bounded, typed reference asset and its SHA-256 provenance;
- at least one `known dimension` supplied by the user;
- a restricted first-use scope: simple, front-on consumer electronics and
  passive hobby enclosures;
- a photo-aware brief passed to the hosted authoring agent;
- the existing current-runtime evaluate/gate loop before a staged edit is
  offered; and
- a clear distinction between observed image facts and inferred depth or
  internals.

`trace_from_image` remains an optional coordinate aid. It is not a device
generator and must not return a confident outer silhouette when it has only
found an internal dark screen. Any Meshy/Tripo-style result remains a
`visual_mesh_reference`, not authoritative CAD.

## Architecture

```text
Studio photo + known dimension
        |
        v
typed reference request (mime, filename, hash, scale)
        |
        v
hosted generate route materializes a managed reference asset
        |
        +--> optional trace_from_image evidence
        |
        v
photo-device brief + existing authoring agent
        |
        v
current evaluate / assembly-interference gates
        |
        v
staged edit -> setCode -> current Studio runtime
```

## Acceptance criteria

- A selected image and known dimension reach the active `StudioGenerate`
  request as structured reference input, not an untracked chat attachment.
- The server validates and materializes that input, records its hash, and
  passes a photo-specific brief into the verified authoring loop.
- The first consumer-device acceptance source has a real cited scale anchor,
  a reference image with positive decoded dimensions, connected parametric
  assembly metadata, zero interference, and a reviewed render.
- The system fails honestly when a photo cannot establish a usable silhouette
  or scale; it does not label an internal display as the outer device.
- Robots, mechanisms, electronics internals, and manufacture-ready claims
  remain outside the one-photo consumer-device path.
