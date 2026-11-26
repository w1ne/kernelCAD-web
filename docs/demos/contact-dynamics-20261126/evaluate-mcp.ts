// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
const folder = dirname(fileURLToPath(import.meta.url));
const code = await readFile(join(folder, 'escapement.kcad.ts'), 'utf8');
const result = await evaluateScriptTool({ code });
await writeFile(join(folder, 'mcp-evaluation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: result.ok, featureCount: result.featureCount, mechanism: result.mechanism, diagnostics: result.diagnostics }));
process.exit(result.ok && result.mechanism === 'real' ? 0 : 1);
