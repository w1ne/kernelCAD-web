// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/diagnostics/fileReadError.ts
//
// One source of truth for the "could not read the script file" message.
//
// Why this exists: the `file` parameter on the script-taking tools only works
// when the kernelCAD server runs on the SAME machine as the caller (local
// stdio MCP / the CLI). Against a hosted server the tool executes in a remote
// process that cannot see the caller's filesystem, so ANY `file` path fails
// with a raw ENOENT — a message that reads like a typo and sends agents into
// a path-fixing loop that can never succeed.
//
// There is no reliable hosted-vs-local signal available inside the tool
// implementations (the `--cloud` flag in src/agent/mcp/server.ts lives in the
// *client* bridge process, which merely proxies arguments to the gateway and
// never runs this code). So the wording names BOTH possibilities explicitly
// and always points at the escape hatch that works everywhere: pass `code`.

/** Diagnostic code every file-read failure reports. Already registered in
 *  `src/shared/diagnostics/registry.ts` with a hint + nextAction. */
export const FILE_READ_CODE = 'cli.file-read';

/** Hint attached to every file-read diagnostic. */
export const FILE_READ_HINT =
  'Either the path does not exist locally, or this kernelCAD server is hosted/remote and cannot see your filesystem. Pass the script inline via `code` instead of `file` — that works on both.';

/** Full user-facing message for a failed read of `file`. */
export function fileReadErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return `Cannot read file: ${msg}. ${FILE_READ_HINT}`;
}
