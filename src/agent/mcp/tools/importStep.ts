// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/importStep.ts
//
// MCP `import_step` tool: bring a user's own STEP or STL file in as the base
// body of a new script. On the hosted connector the server cannot read the
// user's disk, and Claude does not forward chat attachments to remote MCP
// servers, so `lib.fromSTEP(path)` alone gives a chat user no way in. This
// tool takes the file from:
//   - `url`: a public https link (direct download), fetched once, or
//   - `upload`: a ChatGPT file reference ({ download_url, file_id, ... }),
//     declared through `_meta['openai/fileParams']`, or
//   - `content_base64`: the raw bytes, for small files a client inlines.
// It writes the file plus a starter `<name>.kcad.ts` (`lib.fromSTEP` /
// `lib.fromSTL`) into output_dir, evaluates it, and returns the script path,
// its code and the body's bounding box so the agent can keep modelling on it.

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';

/** Hard cap on imported file size. */
export const IMPORT_MAX_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface OpenAiFileRef {
  download_url: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
}

export interface ImportStepInput {
  url?: string;
  upload?: OpenAiFileRef;
  content_base64?: string;
  /** Original file name; used for format detection when bytes are inlined. */
  file_name?: string;
  /** 'step' | 'stl'; detected from the bytes when omitted. */
  format?: 'step' | 'stl';
  /** Directory for the imported file and starter script (default: a fresh temp dir). */
  output_dir?: string;
  /** Base name for the written files, default 'imported'. */
  name?: string;
  /** STL only: accept a non-watertight mesh as an open shell. */
  allow_open?: boolean;
}

export interface ImportStepOutput {
  ok: boolean;
  format?: 'step' | 'stl';
  /** The imported file as written to disk. */
  model_path?: string;
  /** Starter script whose base body is the imported file; pass it as { file } to other tools. */
  script_path?: string;
  code?: string;
  byte_count?: number;
  bbox?: { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] };
  diagnostics: CompilerDiagnostic[];
  error?: string;
}

function fail(error: string, diagnostics: CompilerDiagnostic[] = []): ImportStepOutput {
  return { ok: false, diagnostics, error };
}

/** True for loopback, private, link-local, CGNAT and unspecified addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s.startsWith('::ffff:')) return isPrivateAddress(s.slice(7));
    return s === '::' || s === '::1' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8')
      || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb');
  }
  return true;
}

/** https only, no credentials, and the host must not resolve to a private address. */
export async function checkFetchUrl(raw: string): Promise<string | undefined> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'url is not a valid URL.';
  }
  if (u.protocol !== 'https:') return 'url must use https.';
  if (u.username !== '' || u.password !== '') return 'url must not carry credentials.';
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return 'url host is not public.';
  let addrs: string[];
  try {
    addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address);
  } catch {
    return `cannot resolve host '${host}'.`;
  }
  if (addrs.length === 0 || addrs.some(isPrivateAddress)) return 'url host is not public.';
  return undefined;
}

async function fetchBytes(url: string): Promise<Uint8Array | string> {
  const bad = await checkFetchUrl(url);
  if (bad !== undefined) return bad;
  let res: Response;
  try {
    // redirect: 'manual' so a public URL cannot bounce the fetch to a private host.
    res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    return `download failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (loc === null) return `download failed: HTTP ${res.status} without a location.`;
    const next = new URL(loc, url).toString();
    const badNext = await checkFetchUrl(next);
    if (badNext !== undefined) return `redirect refused: ${badNext}`;
    try {
      res = await fetch(next, { redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch (e) {
      return `download failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (!res.ok) return `download failed: HTTP ${res.status}.`;
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > IMPORT_MAX_BYTES) return `file is larger than ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > IMPORT_MAX_BYTES) return `file is larger than ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`;
  return buf;
}

/** STEP by its ISO-10303-21 header, else STL (binary size match or ASCII 'solid'), else the extension. */
export function detectFormat(bytes: Uint8Array, fileName?: string): 'step' | 'stl' | undefined {
  const head = Buffer.from(bytes.subarray(0, 512)).toString('latin1').trimStart();
  if (head.startsWith('ISO-10303-21')) return 'step';
  if (bytes.byteLength >= 84) {
    const n = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).readUInt32LE(80);
    if (84 + 50 * n === bytes.byteLength) return 'stl';
  }
  if (/^solid[\s\S]*facet/i.test(Buffer.from(bytes.subarray(0, 4096)).toString('latin1').trimStart())) return 'stl';
  const ext = fileName?.toLowerCase().match(/\.(step|stp|stl)$/)?.[1];
  if (ext === 'step' || ext === 'stp') return 'step';
  if (ext === 'stl') return 'stl';
  return undefined;
}

export function starterScript(fileBase: string, format: 'step' | 'stl', allowOpen: boolean): string {
  const call = format === 'step'
    ? `await lib.fromSTEP('./${fileBase}')`
    : `await lib.fromSTL('./${fileBase}'${allowOpen ? ', { allowOpen: true }' : ''})`;
  return [
    `// Base body imported by import_step from ${fileBase}.`,
    `const base = ${call};`,
    '// Add features to `base` (e.g. base.subtract(...), base.union(...)) and return the result.',
    'return base;',
    '',
  ].join('\n');
}

export async function importStepTool(input: ImportStepInput): Promise<ImportStepOutput> {
  const sources = [input.url, input.upload, input.content_base64].filter(s => s !== undefined);
  if (sources.length !== 1) return fail('Provide exactly one of url, upload or content_base64.');
  const name = input.name ?? 'imported';
  if (!NAME_RE.test(name)) return fail('name must be 1-64 characters of letters, digits, ".", "_" or "-".');
  if (input.format !== undefined && input.format !== 'step' && input.format !== 'stl') return fail("format must be 'step' or 'stl'.");

  let bytes: Uint8Array;
  let fileName = input.file_name;
  if (input.content_base64 !== undefined) {
    if (typeof input.content_base64 !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(input.content_base64)) {
      return fail('content_base64 must be base64 text.');
    }
    if (input.content_base64.length > (IMPORT_MAX_BYTES * 4) / 3 + 4) return fail(`file is larger than ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
    bytes = new Uint8Array(Buffer.from(input.content_base64, 'base64'));
  } else {
    const url = input.url ?? input.upload?.download_url;
    if (typeof url !== 'string' || url.length === 0) return fail('upload.download_url is required.');
    fileName ??= input.upload?.file_name ?? new URL(url, 'https://x/').pathname.split('/').pop();
    const got = await fetchBytes(url);
    if (typeof got === 'string') return fail(got);
    bytes = got;
  }
  if (bytes.byteLength === 0) return fail('the file is empty.');

  const format = input.format ?? detectFormat(bytes, fileName);
  if (format === undefined) return fail('could not tell whether the file is STEP or STL; pass format.');

  let dir: string;
  if (input.output_dir !== undefined) {
    const check = validateOutputPath(input.output_dir);
    if (!check.ok || check.resolved === undefined) return fail(check.error ?? `Refusing to write to ${input.output_dir}.`);
    dir = resolve(check.resolved);
    await mkdir(dir, { recursive: true });
  } else {
    dir = await mkdtemp(join(tmpdir(), 'kernelcad-import-'));
  }

  const fileBase = `${name}.${format}`;
  const model_path = join(dir, fileBase);
  const script_path = join(dir, `${name}.kcad.ts`);
  const code = starterScript(fileBase, format, input.allow_open === true);
  await writeFile(model_path, bytes);
  await writeFile(script_path, code);

  const built = await evaluateAndBuildScript({ file: script_path });
  const diagnostics = built.evaluation.diagnostics;
  const shape = built.model?.rootShape ?? built.model?.tailShape;
  if (built.evaluation.exitCode !== 0 || shape === undefined) {
    return {
      ok: false, format, model_path, script_path, code, byte_count: bytes.byteLength, diagnostics,
      error: diagnostics.find(d => d.severity === 'error')?.message ?? 'the imported file did not produce a solid.',
    };
  }
  const bb = shape.boundingBox();
  const min = [...bb.min] as [number, number, number];
  const max = [...bb.max] as [number, number, number];
  return {
    ok: true, format, model_path, script_path, code, byte_count: bytes.byteLength,
    bbox: { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] },
    diagnostics,
  };
}
