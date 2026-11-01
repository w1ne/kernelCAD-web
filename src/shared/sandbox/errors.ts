// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sandbox refusal errors. All three carry a registered diagnostic code
// (src/shared/diagnostics/registry/cli.ts) so the CLI, the MCP server and the
// script runtime surface them as structured diagnostics, never as a bare
// EACCES or a hung socket.

import { KernelError } from '../intent/kernelError';
import { invalidArgsError } from '../intent/invalidArgs';
import { HINT_TEMPLATES } from '../diagnostics/registry';
import type { SandboxAccess } from './pathGuard';

/** Marker so callers can tell a sandbox refusal from any other KernelError. */
export const SANDBOX_CODES = [
  'cli.sandbox-path-denied',
  'cli.sandbox-network-denied',
  'cli.sandbox-command-refused',
] as const;
export type SandboxCode = (typeof SANDBOX_CODES)[number];

export function isSandboxError(e: unknown): e is KernelError & { code: SandboxCode } {
  return e instanceof KernelError && (SANDBOX_CODES as readonly string[]).includes(e.code);
}

/** Errno-style alias so node callers that branch on `err.code` still see a denial. */
function tagErrno(err: KernelError, errno: string): KernelError {
  Object.defineProperty(err, 'errno', { value: errno, enumerable: false });
  Object.defineProperty(err, 'syscallDenied', { value: true, enumerable: false });
  return err;
}

/**
 * A user-supplied path ARGUMENT (MCP tool input or CLI argument) escapes the
 * workspace. Goes through the shared `invalidArgsError` builder so the message
 * names the argument, what was received, what is required and an example.
 */
export function sandboxPathArgError(spec: {
  api: string;
  arg: string;
  got: string;
  detail: string;
  workspaceRoot: string;
}): KernelError {
  return invalidArgsError({
    code: 'cli.sandbox-path-denied',
    api: spec.api,
    path: spec.arg,
    got: spec.got,
    requires: `a path inside the sandbox workspace ${spec.workspaceRoot} (${spec.detail})`,
    example: `${spec.arg}: "out/part.step" (relative to the workspace)`,
    hint: HINT_TEMPLATES['cli.sandbox-path-denied'].template,
  });
}

/** The node:fs backstop refused an operation (no argument name to report). */
export function sandboxFsError(op: string, access: SandboxAccess, detail: string): KernelError {
  const err = new KernelError(
    'cli.sandbox-path-denied',
    `sandbox: ${op} (${access}) refused — ${detail}.`,
    undefined,
    HINT_TEMPLATES['cli.sandbox-path-denied'].template,
  );
  return tagErrno(err, 'EACCES');
}

/** An outbound connection / fetch / DNS lookup / URL argument was refused. */
export function sandboxNetworkError(what: string, target: string): KernelError {
  const err = new KernelError(
    'cli.sandbox-network-denied',
    `sandbox: outbound network refused — ${what} to ${target}. Sandbox mode blocks all network egress from the kernelCAD runtime.`,
    undefined,
    HINT_TEMPLATES['cli.sandbox-network-denied'].template,
  );
  return tagErrno(err, 'ENETUNREACH');
}

/** A whole command / tool / server mode is unavailable under the sandbox. */
export function sandboxCommandRefused(what: string, why: string): KernelError {
  return new KernelError(
    'cli.sandbox-command-refused',
    `sandbox: ${what} is unavailable in sandbox mode — ${why}.`,
    undefined,
    HINT_TEMPLATES['cli.sandbox-command-refused'].template,
  );
}
