// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { basename } from 'node:path';

export function demoDisplayName(args: {
  task?: string;
  heroArtifact?: string;
  scriptPath?: string;
}): string {
  return args.task ?? args.heroArtifact ?? (args.scriptPath ? basename(args.scriptPath, '.kcad.ts') : 'demo');
}
