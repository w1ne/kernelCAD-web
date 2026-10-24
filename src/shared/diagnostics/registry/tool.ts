// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const TOOL_CODES = {
  // W4 §3 — trace_from_image MCP tool diagnostics (5).
  'tool.trace-from-image.invalid-image-url': {
    hintTemplate:
      "Pass a non-empty `imageUrl` — a file:// path, http(s):// URL, data:image/...;base64,... URI, or a bare filesystem path.",
    nextAction: { kind: 'fix-arg', field: 'imageUrl' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image was called with a missing, empty, or otherwise unparseable imageUrl.',
  },
  'tool.trace-from-image.no-features-requested': {
    hintTemplate:
      "Pass at least one feature in `features`, or omit the `features` field to fall back to the default silhouette request.",
    nextAction: { kind: 'fix-arg', field: 'features' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image was called with an explicitly empty features array.',
  },
  'tool.trace-from-image.image-fetch-failed': {
    hintTemplate:
      "Verify the imageUrl resolves to a readable PNG/JPEG/WebP/GIF — check the path/URL, the file's existence, and network access for http(s) URLs.",
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'trace_from_image could not fetch or decode the image at the supplied URL.',
  },
  'tool.trace-from-image.backend-failed': {
    hintTemplate:
      "The selected backend threw while extracting features. Re-call with a different `backend` (e.g. `vision-llm` if `opencv` failed on a cluttered photo), tighten `region` on the requested features, or inspect the diagnostic message for the underlying error.",
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'The trace_from_image backend (opencv / vision-llm / hybrid) threw while extracting features.',
  },
  'tool.trace-from-image.opencv-cannot-label': {
    hintTemplate:
      "opencv only extracts a single silhouette — it cannot label point/bbox features. Either drop the point/bbox features, or switch backend to `hybrid` so the LLM labels them on top of the opencv silhouette.",
    nextAction: { kind: 'fix-arg', field: 'backend' },
    defaultSeverity: 'warn',
    group: 'tool',
    description: 'A point/bbox feature was requested but the opencv backend was forced, so only the silhouette polyline could be returned.',
  },
  'tool.trace-from-image.trace-timeout': {
    hintTemplate:
      "The selected backend did not return within the hard time budget and was aborted to avoid hanging the tool. Retry with a smaller image, a different `backend`, or check that the vision-LLM credentials/network are reachable.",
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'A trace_from_image backend exceeded the hard per-call timeout and was aborted.',
  },
  // send_to_printer (2) — Slice B
  'tool.send-to-printer.unreachable': {
    hintTemplate:
      'The printer could not be reached with the given protocol/host/port. Verify the printer is on and network-reachable, the port matches the protocol (OctoPrint/Moonraker: HTTP; Bambu LAN mode: FTPS 990 + MQTT 8883), and retry with { dryRun: true } to isolate connectivity from upload.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'send_to_printer could not connect to, or authenticate against, the target printer (OctoPrint/Moonraker HTTP, or Bambu FTPS/MQTT).',
  },
  'tool.send-to-printer.upload-failed': {
    hintTemplate:
      'The connection succeeded but the file upload or print-start command failed. Inspect the diagnostic message for the printer\'s own error, check available storage on the printer, and confirm the gcode file exists and is non-empty.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'send_to_printer connected to the printer but the G-code upload (or, for Bambu, the print-start MQTT command) was rejected or failed mid-transfer.',
  },
  // Trace-guided repair (4) — repair_script's own failure vocabulary.
  'tool.repair.no-candidate': {
    hintTemplate:
      'No mechanical fix is derivable for this diagnostic kind. Edit the returned repairRegion by hand — the lines are already narrowed to the failing feature, its inputs, and the params it reads.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'info',
    group: 'tool',
    description: 'repair_script has no candidate generator for the selected diagnostic code, so only the repair region is returned.',
  },
  'tool.repair.out-of-region': {
    hintTemplate:
      'The patch targets lines outside the repair region and was refused. Re-derive candidates with why_did_this_fail against the failing feature, or edit those lines yourself.',
    nextAction: { kind: 'call-introspection-tool', tool: 'why_did_this_fail' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'A repair patch would have rewritten lines outside the computed repair region and was rejected.',
  },
  'tool.repair.exhausted': {
    hintTemplate:
      'Every candidate was applied and re-evaluated without clearing the diagnostic. Raise max_attempts, or treat the returned attempts as evidence and author the fix yourself.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'repair_script applied every available candidate and none cleared the target diagnostic without new errors.',
  },
  'tool.repair.source-drift': {
    hintTemplate:
      'The lines the patch expected no longer match the file. Re-run evaluate_script and why_did_this_fail against the current source, then repair again.',
    nextAction: { kind: 'call-tool', tool: 'evaluate_script', args: {} },
    defaultSeverity: 'error',
    group: 'tool',
    description: 'A repair patch anchor text did not match the current source, so the patch was refused rather than applied blind.',
  },
} as const satisfies Record<`tool.${string}`, DiagnosticCodeSpec>;
