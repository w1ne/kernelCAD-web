// tests/integration/cli-bundle/startup.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolvePath(__dirname, '../../../dist/cli/index.js');

// Non-skippable. Unlike `tests/integration/mcp/spawn.test.ts`, this suite
// FAILS (rather than skipping) when the bundle is missing — the rc.11
// hotfix demonstrated that silent skips can hide real bundle regressions.
// Pre-merge gate: `npm run qc` runs `build:cli` before tests. Inner-loop
// developers running `npm test` without a build will see this test fail.

describe('CLI bundle startup', () => {
  it('the bundle artifact exists at dist/cli/index.js', () => {
    expect(existsSync(CLI_BIN)).toBe(true);
  });

  it('the bundle boots without crashing and answers a JSON-RPC initialize', async () => {
    expect(existsSync(CLI_BIN)).toBe(true);

    const child = spawn('node', [CLI_BIN, 'mcp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout!.on('data', (chunk) => { stdoutBuf += chunk.toString(); });
    child.stderr!.on('data', (chunk) => { stderrBuf += chunk.toString(); });

    let exitedEarly = false;
    let exitCode: number | null = null;
    child.on('exit', (code) => { exitedEarly = true; exitCode = code; });

    const initReq = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'rc12-startup-sentinel', version: '1.0' },
      },
    }) + '\n';
    child.stdin!.write(initReq);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(
          `Bundle startup timed out. exitedEarly=${exitedEarly} exitCode=${exitCode} ` +
          `stdout=${stdoutBuf.slice(0, 500)} stderr=${stderrBuf.slice(0, 500)}`,
        ));
      }, 30000);

      const checkComplete = () => {
        if (exitedEarly) {
          clearTimeout(timer);
          reject(new Error(
            `Bundle exited before initialize response. exitCode=${exitCode} ` +
            `stdout=${stdoutBuf.slice(0, 500)} stderr=${stderrBuf.slice(0, 500)}`,
          ));
          return;
        }
        const lines = stdoutBuf.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length >= 1) {
          try {
            const resp = JSON.parse(lines[0]);
            if (resp.jsonrpc === '2.0' && resp.id === 1) {
              clearTimeout(timer);
              resolve();
              return;
            }
          } catch { /* keep waiting */ }
        }
      };

      child.stdout!.on('data', checkComplete);
      child.on('error', (err) => { clearTimeout(timer); reject(err); });
      checkComplete();
    });

    child.kill();

    expect(stderrBuf).not.toMatch(/SyntaxError|TypeError|ReferenceError|Cannot find module/);
  }, 45000);
});
