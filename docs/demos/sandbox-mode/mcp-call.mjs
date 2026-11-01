// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Demo helper: start `kernelcad mcp --sandbox` (stdio), print the initialize
// sandbox title and the compact result of each tools/call given on argv as
// JSON: [{ "name": ..., "arguments": {...} }, ...].
import { spawn } from 'node:child_process';

const [cli, callsJson] = process.argv.slice(2);
const calls = JSON.parse(callsJson);
const child = spawn(process.execPath, [cli, 'mcp', '--sandbox'], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
child.stdout.on('data', d => {
  buf += d;
  const lines = buf.split('\n').slice(0, -1).filter(Boolean);
  if (lines.length < calls.length + 1) return;
  child.kill();
  for (const m of lines.map(l => JSON.parse(l)).sort((a, b) => a.id - b.id)) {
    if (m.id === 0) {
      console.log(`initialize → ${m.result.serverInfo.title}; instructions: "${m.result.instructions.split('\n')[0]}"`);
      continue;
    }
    const body = JSON.parse(m.result.content[0].text);
    const call = calls[m.id - 1];
    console.log(`${call.name}(${JSON.stringify(call.arguments)})`);
    console.log(body.ok === false ? `  → isError ${body.errorCode}: ${body.error}` : `  → ok, wrote ${body.output_path} (${body.byte_count} bytes)`);
  }
});
const send = m => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...m })}\n`);
send({ id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'demo', version: '1' } } });
calls.forEach((c, i) => send({ id: i + 1, method: 'tools/call', params: c }));
