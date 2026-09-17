// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const CLI_CODES = {
  // CLI / IO (5)
  'cli.invalid-args': {
    hintTemplate: 'CLI was called with missing or malformed arguments. Run `kernelcad --help`.',
    nextAction: { kind: 'check-cli-args' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'The kernelcad CLI was invoked with missing or malformed arguments.',
  },
  'cli.script-exception': {
    hintTemplate:
      'Your script raised an exception during execution. Read the diagnostic message for the JS error.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'The user script raised an uncaught JavaScript exception during execution.',
  },
  'cli.host-fs-unavailable': {
    hintTemplate:
      'This feature reads files from disk and is unavailable in the browser runtime. Run the script through the kernelCAD CLI or MCP server, or drop the call.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cli',
    description:
      'The script called a feature that needs filesystem access (referenceImage, lib.fromSTEP/fromSTL, fontPath fonts, parts catalog) from a runtime that has no filesystem — typically the in-browser script engine.',
  },
  'cli.file-read': {
    hintTemplate:
      'kernelCAD could not read the script file. Either the path does not exist locally, or this server is hosted/remote and cannot see your filesystem — pass the script inline via `code` instead of `file`.',
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'kernelCAD could not read the script file at the given path (missing locally, or the server is remote and has no access to the caller\'s filesystem).',
  },
  'cli.file-write': {
    hintTemplate:
      'kernelCAD could not write the output file. Check the output path is writable and that -o points at a directory when exporting multiple parts.',
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'kernelCAD could not write an export output file at the given path.',
  },
  'cli.export-exception': {
    hintTemplate: 'An exception occurred during export. Read the diagnostic message for details.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cli',
    description: 'An unhandled exception occurred during an export operation (STL, STEP, etc.).',
  },
} as const satisfies Record<`cli.${string}`, DiagnosticCodeSpec>;
