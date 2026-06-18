// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/reviewPaint.ts
//
// MCP tool surface for Studio's inpainting-style review packets.
//
// Studio's MarkingOverlay writes packets to disk via the dev-server
// `/__kernelcad/review-paint` middleware:
//   <repoRoot>/<scriptPath>.review-paint/<timestamp>/{screenshot.png,
//                                                    mask.png, meta.json}
// with a `latest` symlink alongside.
//
// `review_paint_peek_latest` returns the newest packet (within a fresh
// window) so any MCP-capable agent — Claude Desktop / Cursor / Windsurf /
// custom — can pick it up on explicit user ask, the same way the local
// Claude Code UserPromptSubmit hook does on every prompt. PNGs are
// returned base64-inline so the calling client doesn't need local-disk
// read access.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Known checkouts that can contain `<file>.review-paint/<ts>/` dirs. */
const KNOWN_ROOTS = [
  join(homedir(), 'projects', 'kernelCAD-web'),
  join(homedir(), 'projects', 'kernelCAD-web-worktrees'),
];

/** Newest packet that counts as "current". 30 minutes is generous enough
 *  for "I painted earlier, switching back to the agent now" without
 *  bleeding stale packets into a fresh conversation. */
const DEFAULT_FRESH_WINDOW_MS = 30 * 60 * 1000;

export interface ReviewPaintPeekLatestInput {
  /** Optional override of the freshness window in seconds. Default 1800. */
  freshness_sec?: number;
  /** Optional list of extra checkout roots to scan. Useful when the user
   *  works on kernelCAD-web from a non-standard path. */
  extra_roots?: string[];
  /** If true, omit the base64 PNGs and return only paths + metadata
   *  (smaller response when the agent only needs to know "is there a
   *  packet" or to forward paths to a Read-capable client). */
  paths_only?: boolean;
}

export interface ReviewPaintPacket {
  /** Absolute path to the timestamped packet directory. */
  packet_dir: string;
  /** Path to the screenshot PNG (absolute). */
  screenshot_path: string;
  /** Path to the mask PNG (absolute). The red-painted regions of this
   *  mask correspond pixel-for-pixel to the screenshot. */
  mask_path: string;
  /** Path to meta.json (absolute). */
  meta_path: string;
  /** ISO timestamp of the packet (also encoded into packet_dir basename). */
  ts: string;
  /** One-line note the user typed when painting (`""` if none). */
  note: string;
  /** Preset intent tags the user picked ("too thick", "missing", …). Carries
   *  WHAT is wrong, complementing struck_parts (WHERE). Empty array if none. */
  tags: string[];
  /** Repo-relative .kcad.ts file under review (null when the packet was
   *  saved without a script context — e.g. user testing at `/`). */
  script_path: string | null;
  /** Assembly part names the brush hit (camera-raycast through painted
   *  pixels at save time). When non-empty this is the authoritative
   *  answer for *which structures* the user marked. */
  struck_parts: string[];
  /** Base64-encoded screenshot PNG (omitted when input.paths_only). */
  screenshot_b64?: string;
  /** Base64-encoded mask PNG (omitted when input.paths_only). */
  mask_b64?: string;
}

export interface ReviewPaintPeekLatestOutput {
  ok: boolean;
  /** Set when no packet was found within the freshness window. */
  empty?: boolean;
  packet?: ReviewPaintPacket;
  /** Diagnostic — which roots were scanned. */
  scanned_roots: string[];
  /** Diagnostic — how many candidate `latest` entries the scan touched. */
  scanned_candidates: number;
}

/** MCP tool: return the newest Studio review-paint packet, if any.
 *  Mirrors the bash/Node UserPromptSubmit hook scan logic so the same
 *  packets are visible whether the agent picks them up via the hook
 *  (Claude Code only) or by calling this tool (any MCP client). */
export async function reviewPaintPeekLatestTool(
  input: ReviewPaintPeekLatestInput = {},
): Promise<ReviewPaintPeekLatestOutput> {
  const roots = [...KNOWN_ROOTS, ...(input.extra_roots ?? [])];
  const windowMs = (input.freshness_sec ?? DEFAULT_FRESH_WINDOW_MS / 1000) * 1000;
  const now = Date.now();

  let candidatesSeen = 0;
  let best: { dir: string; mtime: number } | null = null;

  for (const root of roots) {
    if (!existsSync(root)) continue;
    walk(root, 0, 8, (entryPath, entryName) => {
      if (entryName !== 'latest') return;
      candidatesSeen++;
      let real;
      try { real = realpathSync(entryPath); } catch { return; }
      const metaPath = join(real, 'meta.json');
      const shotPath = join(real, 'screenshot.png');
      const maskPath = join(real, 'mask.png');
      // mask + meta are required; screenshot is optional — saves taken
      // before the renderer canvas mounted have mask-only packets.
      if (!existsSync(metaPath)) return;
      if (!existsSync(maskPath)) return;
      void shotPath;
      let mtime;
      try { mtime = statSync(entryPath).mtimeMs; } catch { return; }
      if (now - mtime > windowMs) return;
      if (!best || mtime > best.mtime) {
        best = { dir: real, mtime };
      }
    });
  }

  if (!best) {
    return { ok: true, empty: true, scanned_roots: roots, scanned_candidates: candidatesSeen };
  }

  // Pull out into local for narrowing inside TypeScript (the loop assigns
  // `best` inside a callback and the inferrer needs the rebind).
  const found: { dir: string; mtime: number } = best;
  let meta: { note?: string; tags?: string[]; scriptPath?: string | null; ts?: string; struckParts?: string[] } = {};
  try { meta = JSON.parse(readFileSync(join(found.dir, 'meta.json'), 'utf8')); } catch {
    // keep defaults
  }

  const packet: ReviewPaintPacket = {
    packet_dir: found.dir,
    screenshot_path: join(found.dir, 'screenshot.png'),
    mask_path: join(found.dir, 'mask.png'),
    meta_path: join(found.dir, 'meta.json'),
    ts: meta.ts ?? new Date(found.mtime).toISOString(),
    note: meta.note ?? '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    script_path: meta.scriptPath ?? null,
    struck_parts: Array.isArray(meta.struckParts) ? meta.struckParts : [],
  };
  if (!input.paths_only) {
    try {
      if (existsSync(packet.screenshot_path)) {
        packet.screenshot_b64 = readFileSync(packet.screenshot_path).toString('base64');
      }
      packet.mask_b64 = readFileSync(packet.mask_path).toString('base64');
    } catch {
      // The file existed in the existsSync check above but vanished in the
      // brief race between then and now — fall through with paths only.
    }
  }

  return {
    ok: true,
    packet,
    scanned_roots: roots,
    scanned_candidates: candidatesSeen,
  };
}

type Visit = (entryPath: string, entryName: string) => void;

function walk(dir: string, depth: number, maxDepth: number, cb: Visit) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const p = join(dir, entry.name);
    if (entry.isSymbolicLink() || entry.isDirectory()) {
      cb(p, entry.name);
      if (entry.isDirectory()) {
        walk(p, depth + 1, maxDepth, cb);
      }
    }
  }
}
