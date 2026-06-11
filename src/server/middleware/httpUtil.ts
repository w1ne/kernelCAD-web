// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Tiny helpers shared by the Slice 2E.bridge middleware handlers. Kept
 * deliberately minimal — these endpoints don't need a framework, just URL
 * parsing + JSON writes.
 */

export interface MinimalRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export function writeJson(res: MinimalRes, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function readQuery(url: string | undefined, name: string): string | null {
  if (!url) return null;
  // The middleware path is stripped by connect, so `req.url` is relative
  // (`/?script=...` or `?script=...`). The base is a placeholder.
  const u = new URL(url, 'http://localhost');
  return u.searchParams.get(name);
}

/**
 * Drain a request body to a UTF-8 string. Used by `POST /params` for the
 * JSON edits payload. Caps at 1 MB to bound memory.
 */
export async function readBody(req: NodeJS.ReadableStream, capBytes = 1_000_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > capBytes) {
        reject(new Error(`request body too large (> ${capBytes} bytes)`));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
