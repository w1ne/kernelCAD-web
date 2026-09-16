// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Lexical + realpath containment guard for the dev-only example routes.
 *
 * The lexical pass rejects `..` traversal, absolute paths, and non-`.kcad.ts`
 * extensions. The realpath pass then resolves the script's parent directory and
 * compares it against the real path of each allowed root, so a symlinked
 * directory inside `examples/` cannot smuggle reads or writes outside it. The
 * target file may not exist yet (PUT of a new example), so only the parent is
 * resolved and the basename re-appended.
 *
 * Allowed roots are `examples/` and `tests/fixtures/` — keep this in sync with
 * the middleware wiring in `vite.config.ts`.
 */

import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

const ALLOWED_ROOT_DIRS = ['examples', 'tests/fixtures'];

function isPathInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function realpathOrNull(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

export function resolveExampleScript(script: string | null, repoRoot: string): string | null {
  if (!script) return null;
  const allowedRoots = ALLOWED_ROOT_DIRS.map((dir) => resolve(repoRoot, dir));
  const scriptPath = resolve(repoRoot, script);
  if (
    !script.endsWith('.kcad.ts') ||
    !allowedRoots.some((root) => isPathInside(root, scriptPath))
  ) {
    return null;
  }

  const realParent = realpathOrNull(dirname(scriptPath));
  if (!realParent) return null;
  const realScriptPath = join(realParent, basename(scriptPath));
  const insideRealRoot = allowedRoots.some((root) => {
    const realRoot = realpathOrNull(root);
    return realRoot !== null && isPathInside(realRoot, realScriptPath);
  });
  return insideRealRoot ? scriptPath : null;
}
