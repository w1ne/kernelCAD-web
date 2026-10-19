// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unzipSync } from 'fflate';
// @ts-expect-error plain .mjs script without type declarations
import { buildChatGptZip, collectSubmissionEntries } from './buildChatGptZip.mjs';

const root = resolve(__dirname, '..', '..');
const pluginDir = join(root, 'plugins', 'kernelcad');
const manifest = JSON.parse(readFileSync(join(pluginDir, 'plugin.json'), 'utf8'));

describe('ChatGPT plugin submission ZIP', () => {
  it('carries the Agent Plugins layout with all four skills', () => {
    const names = Object.keys(collectSubmissionEntries(pluginDir)).sort();
    expect(names).toContain('plugin.json');
    expect(names).toContain('mcp.json');
    expect(names).toContain('assets/logo.svg');
    expect(names).toEqual(
      expect.arrayContaining([
        'skills/kernelcad-cookbooks/SKILL.md',
        'skills/kernelcad-design-loop/SKILL.md',
        'skills/kernelcad-export/SKILL.md',
        'skills/kernelcad-studio-paint/SKILL.md',
      ]),
    );
  });

  it('omits the Claude, Cursor and Gemini manifests', () => {
    const names = Object.keys(collectSubmissionEntries(pluginDir));
    expect(names.some((n) => n.startsWith('.claude-plugin/'))).toBe(false);
    expect(names.some((n) => n.startsWith('.cursor-plugin/'))).toBe(false);
    expect(names).not.toContain('GEMINI.md');
  });

  it('builds a readable ZIP named for the manifest version', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'kcad-chatgpt-zip-'));
    const built = buildChatGptZip({ root, out: join(outDir, 'plugin.zip') });
    expect(built.path.endsWith('plugin.zip')).toBe(true);
    const entries = Object.keys(unzipSync(new Uint8Array(readFileSync(built.path))));
    expect(entries).toEqual(expect.arrayContaining(['plugin.json', 'mcp.json', 'assets/logo.svg']));
    const zippedManifest = JSON.parse(new TextDecoder().decode(unzipSync(new Uint8Array(readFileSync(built.path)))['plugin.json']));
    expect(zippedManifest.version).toBe(manifest.version);
    expect(zippedManifest.extensions['com.openai'].interface.shortDescription.length).toBeLessThanOrEqual(30);
  });
});
