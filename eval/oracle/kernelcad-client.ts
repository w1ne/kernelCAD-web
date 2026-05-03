import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { EvaluateResult, ShapeInfo } from '../types';

const LOCAL_BUILD = './dist/cli/index.js';

function getBin(): { cmd: string; baseArgs: string[] } {
  const override = process.env.KERNELCAD_BIN;
  if (override) {
    // If the override ends in .js, we run it via node.
    if (override.endsWith('.js')) {
      return { cmd: 'node', baseArgs: [override] };
    }
    return { cmd: override, baseArgs: [] };
  }
  // Fallback to the in-repo build if it exists. Lets CI work without setting
  // KERNELCAD_BIN as long as `npm run build:cli` ran first (which `npm run qc`
  // does). Local dev can still override via KERNELCAD_BIN or use `npm link`.
  if (existsSync(LOCAL_BUILD)) {
    return { cmd: 'node', baseArgs: [LOCAL_BUILD] };
  }
  return { cmd: 'kernelcad', baseArgs: [] };
}

async function runOnce(args: string[], stdin?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cmd, baseArgs } = getBin();
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, [...baseArgs, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

export async function evaluateScript(scriptPath: string): Promise<EvaluateResult> {
  const r = await runOnce(['evaluate', '--json', scriptPath]);
  // The CLI may print the JSON to stdout regardless of exit code; try to parse.
  try {
    const parsed = JSON.parse(r.stdout);
    return {
      ok: !!parsed.ok && Array.isArray(parsed.diagnostics) && parsed.diagnostics.length === 0,
      diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [],
      featureCount: parsed.featureCount,
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'cli.script.exception',
          message: `kernelcad evaluate exited with code ${r.code}: ${r.stderr.trim() || r.stdout.trim() || '(no output)'}`,
        },
      ],
    };
  }
}

export async function getShapeInfo(scriptPath: string): Promise<ShapeInfo> {
  // One-shot MCP call: open the server, send a single tools/call request, read response, kill.
  // Per MCP stdio transport, requests are JSON-RPC newline-delimited.
  const initialize = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'kernelcad-eval', version: '0.1.0' } },
  });
  const initialized = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const callTool = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_shape_info', arguments: { file: scriptPath } },
  });
  const stdin = `${initialize}\n${initialized}\n${callTool}\n`;

  const r = await runOnce(['mcp'], stdin);
  // Parse newline-delimited JSON responses; find the one with id === 2.
  const lines = r.stdout.split('\n').filter((l) => l.trim().length > 0);
  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      (parsed as { id: unknown }).id === 2 &&
      'result' in parsed
    ) {
      // MCP tool result is a content array; the first item is text JSON for our tools.
      const result = (parsed as { result: { content?: Array<{ type: string; text?: string }> } }).result;
      const text = result.content?.[0]?.text;
      if (typeof text !== 'string') {
        throw new Error(`get_shape_info returned no text content: ${JSON.stringify(result)}`);
      }
      const shapeJson = JSON.parse(text);
      // Contract: the MCP tool returns { ok: boolean, shape: { volume, surfaceArea, bbox: { min, max } } }.
      // If the producer ever changes this shape, fail loudly here so the eval harness doesn't silently produce nonsense.
      if (typeof shapeJson !== 'object' || shapeJson === null || typeof shapeJson.shape !== 'object' || shapeJson.shape === null) {
        throw new Error(`get_shape_info returned unexpected envelope (expected { ok, shape: {...} }): ${text}`);
      }
      const shape = shapeJson.shape;
      if (
        typeof shape.volume !== 'number' ||
        typeof shape.surfaceArea !== 'number' ||
        !shape.bbox ||
        !Array.isArray(shape.bbox.min) ||
        !Array.isArray(shape.bbox.max)
      ) {
        throw new Error(`get_shape_info returned unexpected shape body: ${text}`);
      }
      return {
        volume: shape.volume,
        surfaceArea: shape.surfaceArea,
        bbox: { min: shape.bbox.min, max: shape.bbox.max },
      };
    }
  }
  throw new Error(
    `get_shape_info: no response with id=2 in stdout. stdout=${r.stdout.slice(0, 500)} stderr=${r.stderr.slice(0, 500)}`,
  );
}

export async function isKernelcadAvailable(): Promise<boolean> {
  try {
    const r = await runOnce(['--version']);
    return r.code === 0;
  } catch {
    return false;
  }
}
