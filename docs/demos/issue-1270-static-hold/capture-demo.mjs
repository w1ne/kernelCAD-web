// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyTool } from '../../../src/agent/mcp/tools/verify.ts';

const bundleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(bundleDir, '../../..');
const cookbookPath = resolve(projectRoot, 'cookbook/snippets/multi-dof-robot-arm-4axis.md');
const markdown = await readFile(cookbookPath, 'utf8');
const code = markdown.match(/```typescript\n([\s\S]*?)\n```/)?.[1];
if (!code) throw new Error(`Could not extract the cookbook script from ${cookbookPath}`);

const result = await verifyTool({ check: 'static-hold', code, scriptDir: projectRoot });
const verificationPath = resolve(bundleDir, 'verification.json');
await writeFile(verificationPath, `${JSON.stringify(result, null, 2)}\n`);

if (typeof result !== 'object' || result === null || !('diagnostics' in result)) {
  throw new Error(`Expected verify to return diagnostics; received ${JSON.stringify(result)}`);
}
if (result.ok !== false) {
  throw new Error(`Expected a non-pass diagnostic result; received ${JSON.stringify(result)}`);
}

const diagnostic = result.diagnostics.find((item) => item.code === 'assembly.joint.static-hold.no-actuator');
if (!diagnostic) throw new Error('Expected assembly.joint.static-hold.no-actuator');

const wrap = (value, width = 62) => {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const resultSlide = [
  'Result: ok = false',
  `${diagnostic.code} [${diagnostic.severity}]`,
  ...wrap(diagnostic.message),
].join('\n');
await writeFile(resolve(bundleDir, 'slide-result.txt'), `${resultSlide}\n`);
process.stdout.write(`${JSON.stringify({
  ok: result.ok,
  diagnostics: result.diagnostics.map(({ code: diagnosticCode, severity, message }) => ({
    code: diagnosticCode,
    severity,
    message,
  })),
}, null, 2)}\n`);
