#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Builds the ChatGPT plugin submission ZIP from plugins/kernelcad.
// Usage: node scripts/agentPlugin/buildChatGptZip.mjs [--out <file>] [--root <dir>]
//
// The ZIP carries only the Agent Plugins layout ChatGPT accepts: root
// plugin.json and mcp.json, skills/ and assets/ (icon and, once captured,
// screenshots). The Claude, Cursor and Gemini manifests are omitted on
// purpose; listing copy lives in docs/listing/chatgpt-directory.md.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

/** Root files and directories that belong in the ChatGPT submission ZIP. */
export const SUBMISSION_ALLOWLIST = ['plugin.json', 'mcp.json', 'skills', 'assets'];

/** Every file the ZIP will carry, keyed by its path inside the archive. */
export function collectSubmissionEntries(pluginDir) {
  const root = resolve(pluginDir);
  const files = {};
  const addFile = (abs) => {
    files[relative(root, abs).split('\\').join('/')] = new Uint8Array(readFileSync(abs));
  };
  const walk = (abs) => {
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(abs).sort()) walk(join(abs, entry));
      return;
    }
    addFile(abs);
  };
  for (const entry of SUBMISSION_ALLOWLIST) walk(join(root, entry));
  return files;
}

/** Write the ZIP and return its path. Deterministic mtimes keep reruns identical. */
export function buildChatGptZip({ root, out } = {}) {
  const repo = root ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const pluginDir = join(repo, 'plugins', 'kernelcad');
  const manifest = JSON.parse(readFileSync(join(pluginDir, 'plugin.json'), 'utf8'));
  const files = collectSubmissionEntries(pluginDir);
  const zip = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, bytes]) => [
        name,
        [bytes, { mtime: new Date('2026-01-01T00:00:00Z') }],
      ]),
    ),
    { level: 9 },
  );
  const target = resolve(out ?? join(repo, 'dist', 'listing', `kernelcad-chatgpt-plugin-${manifest.version}.zip`));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, zip);
  return { path: target, bytes: zip.length, files: Object.keys(files) };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : undefined;
  const root = args.includes('--root') ? args[args.indexOf('--root') + 1] : undefined;
  const built = buildChatGptZip({ root, out });
  console.log(`Wrote ${built.path} (${built.bytes} bytes, ${built.files.length} files)`);
}
