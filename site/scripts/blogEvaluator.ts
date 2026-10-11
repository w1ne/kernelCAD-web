// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `kernelcad evaluate --json`, run in this process. The CLI's own function
// builds the object, so a check reads exactly what the CLI prints; the JSON
// round trip drops what printing drops (undefined fields, functions).
//
// The build imports this module only when a post has a kcad block or a check,
// so a site build without them never loads the kernel.

import path from 'node:path';
import { evaluateJsonOutput, evaluateWithEnvelope } from '../../src/agent/cli/commands/evaluate';
import type { EvaluateJson, Evaluator } from './blogChecks';

async function run(input: { file: string } | { code: string }): Promise<EvaluateJson> {
  const result = await evaluateWithEnvelope(input);
  return JSON.parse(JSON.stringify(evaluateJsonOutput(result))) as EvaluateJson;
}

/** An evaluator that runs each model file once and keeps its output. */
export function createEvaluator(repoRoot: string): Evaluator {
  const byFile = new Map<string, Promise<EvaluateJson>>();
  return {
    file(repoPath) {
      let output = byFile.get(repoPath);
      if (output === undefined) {
        output = run({ file: path.join(repoRoot, repoPath) });
        byFile.set(repoPath, output);
      }
      return output;
    },
    code(source) {
      return run({ code: source });
    },
  };
}
