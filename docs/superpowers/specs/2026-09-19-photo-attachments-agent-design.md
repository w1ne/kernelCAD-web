# Photo Attachments in the Agent Composer

## Problem

The Studio agent rail renders a separate "Simple-device photo reference" panel
(`src/studio/components/ReferencePhotoPanel.tsx`) with its own file input and
required `Known dimension label` / `Known dimension (mm)` fields. The composer
directly below it already has an `Include files` control, so the rail presents
two attachment surfaces for one intent and blocks submission until the user
fills a scale form (`referenceNeedsDimension`).

The product intent is the opposite: attach a photo with `Include files`, say
"build this e-reader" in the same box, and let the agent do the work — ask for a
real-world measurement when it is unsure, and note that sizes stay editable
after the build.

## Goals

- One attachment surface: photos are added through the composer's existing
  `Include files` button.
- Remove the photo panel and all `knownDimension` input UI; submitting a photo
  is never blocked on a scale form.
- Deliver the photo to the existing server vision pipeline via
  `referenceImage` with no required `knownDimension`.
- The agent uses the server's deterministic trace and its tools; when no
  physical scale is known it must say so and ask, never fabricate precision.
- The flow works end to end in the browser (client-side file read and bounded
  data-URL upload).
- Preserve all existing image validation and size limits.

## Non-goals

- Multiple photos per message.
- Client-side measurement extraction from the photo.
- New upload endpoints or persistent photo storage.
- Changing the deterministic simple-photo-e-reader builder when a width label
  is supplied.
- Editing the generated model inside the composer.

## UX

- `Include files` keeps today's cap of five text/code files and additionally
  accepts one image (`image/png`, `image/jpeg`, `image/webp`, at most 4 MiB).
- An attached photo appears as a chip with its filename and a remove button,
  alongside the text-file chips.
- A second photo is rejected inline: "One photo per build."
- The prompt carries the intent, for example "build this e-reader". Users may
  state a measurement in the message; nothing requires it.
- Attachment errors render inline via `role="alert"` (wrong type, too large,
  more than one photo, unreadable file).
- The send button is never disabled because of photo state; existing
  busy/reading/first-message gating is unchanged.

## Web architecture (kernelCAD-web)

- `src/studio/AgentComposer.tsx` owns all attachment state. `Attachment`
  becomes a discriminated union (`kind: 'text' | 'image'`). Images are read with
  `FileReader.readAsDataURL` (the pattern already proven in
  `useReferencePhoto`), text files keep `file.text()`.
- The composer's submit contract becomes
  `onSubmit(message: string, referenceImage?: GenerateRequest['referenceImage'])`.
  Photos are passed separately; their bytes are never appended to the prompt
  (that would only bloat the 63,000-character budget).
- `referenceImage` sent by the client is `{ dataUrl, fileName, mimeType }` with
  no `knownDimension`.
- `src/studio/components/GenerateForm.tsx` drops `ReferencePhotoPanel` and the
  photo/dimension props; it forwards the composer's submit straight through.
- `src/studio/StudioGenerate.tsx` stops calling `useReferencePhoto`; removes
  `photoReferenceSelected`, `referenceNeedsDimension`, and
  `readingReferenceImage` wiring.
- Delete `src/studio/components/ReferencePhotoPanel.tsx`,
  `src/studio/hooks/useReferencePhoto.ts`, and their tests.
- `src/studio/hooks/useAgentGeneration.ts` accepts an optional photo on submit
  and passes it to `runAgent`; the dimension-error gate is removed.
- `src/funnel/lib/generateClient.ts`: `referenceImage.knownDimension` becomes
  optional in the request type.

## Server contract (kernelCAD-server)

- `src/routes/generate.ts`: `referenceImageSchema.knownDimension` becomes
  optional; every other field/limit is unchanged.
- `src/agent/photoReference.ts`: `knownDimension` is optional on the input,
  prepared, and materialized types. Byte, magic-number, pixel, and hash
  validation is unchanged.
- `src/agent/orchestrator.ts` (`buildPhotoReferenceBrief`): the
  "Known physical scale … authoritative" and provenance-comment lines are
  emitted only when `knownDimension` exists. Without it the brief states that
  the trace proportions are observed evidence, that no real-world scale is
  known, and that the agent must not invent millimetre precision — it should
  surface a request for one measurement in `suggestions`.
- `src/agent/simplePhotoEreader.ts`: return `null` (no deterministic build)
  when `knownDimension` is absent; the model-driven path handles the build.
- Model selection and the pre-LLM deterministic trace are unchanged.

## Data flow

1. User picks a photo in `Include files`; the composer reads it to a data URL.
2. Submit calls `onSubmit(prompt, referenceImage)`.
3. `useAgentGeneration` forwards the photo through the existing
   `useGeneration.submit(..., referenceImage)` path.
4. `POST /api/v1/generate` carries `referenceImage` without `knownDimension`.
5. The route validates and materializes the photo, derives the deterministic
   silhouette trace, and runs the vision agent with the photo brief.
6. The artifact returns to Studio, where parameters stay editable; the agent's
   suggestions may ask the user for the real measurement.

## Error handling

- Client: inline errors for unsupported types, files over 4 MiB, more than one
  image, and unreadable data. Server limits are mirrored client-side so bad
  uploads never leave the browser.
- Server: `400 invalid_reference_image` shape and all auth/quota gates are
  unchanged. A photo without `knownDimension` is valid.
- Agent: with no scale, the brief forbids claiming observed millimetre
  precision; comments and suggestions distinguish observed proportions from
  inferred dimensions.

## Testing

- Web
  - `AgentComposer`: attaching an image yields `referenceImage` on submit
    without prompt pollution; a second image is rejected; type/size errors;
    text-file behavior is unchanged.
  - `StudioGenerate` / `GenerateForm`: submit passes the photo through; no
    dimension gate exists.
  - Delete `ReferencePhotoPanel` and `useReferencePhoto` tests with their
    sources.
- Server
  - Route integration: `referenceImage` without `knownDimension` is accepted;
    invalid MIME/oversize still return 400; the request still routes to the
    photo model.
  - Orchestrator brief: scale line present only when supplied;
    `simplePhotoEreader` returns null without a width label.
- Verification: focused vitest bundles plus `tsc` and `eslint`, then a Chrome
  pass that attaches a PNG, submits, and confirms the request body.

## Rollout order

The server must accept an absent `knownDimension` before the web client stops
sending it. Deploy `kernelCAD-server` first, then `kernelCAD-web`; otherwise the
new client gets `400 invalid_reference_image`.
