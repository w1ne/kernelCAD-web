// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildManifests, openaiExtensions } from '../../../scripts/agentPlugin/buildManifests.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${ROOT}${rel}`, 'utf8');
const cfg = JSON.parse(read('agent-plugin.config.json'));
const version: string = JSON.parse(read('package.json')).version;

describe('agent plugin manifests', () => {
  it('committed manifests match the generator output', () => {
    for (const [rel, obj] of Object.entries(buildManifests(cfg, version))) {
      expect(read(rel), rel).toBe(JSON.stringify(obj, null, 2) + '\n');
    }
  });

  it('the ChatGPT package carries URLs, icon, review cases and release notes', () => {
    const ext = JSON.parse(read('plugins/kernelcad/plugin.json')).extensions['com.openai'];
    expect(ext.interface.privacyPolicyURL).toBe('https://kernelcad.com/privacy');
    expect(ext.interface.termsOfServiceURL).toBe('https://kernelcad.com/terms');
    expect(ext.interface.logo).toBe('./assets/logo.png');
    expect(ext.interface.composerIcon).toBe('./assets/logo.svg');
    // The submission importer only resolves ./-prefixed paths, and the file must ship.
    expect(existsSync(`${ROOT}plugins/kernelcad/${ext.interface.logo.replace(/^\.\//, '')}`)).toBe(true);
    expect(existsSync(`${ROOT}plugins/kernelcad/${ext.interface.composerIcon.replace(/^\.\//, '')}`)).toBe(true);
    expect(ext.review.test_cases.positive).toHaveLength(5);
    expect(ext.review.test_cases.negative).toHaveLength(3);
    // The dashboard rejects arrays here: tools_triggered must be a string, and
    // negative cases that trigger nothing omit the field.
    for (const c of ext.review.test_cases.positive) {
      expect(typeof c.tools_triggered).toBe('string');
      expect(c.tools_triggered.length).toBeGreaterThan(0);
    }
    for (const c of ext.review.test_cases.negative) {
      // Negative cases may name the tool that must refuse (e.g. import_step).
      if (c.tools_triggered !== undefined) expect(typeof c.tools_triggered).toBe('string');
    }
    // The public plugin has no purchase flow.
    expect(ext.review.commerce).toBe(false);
    expect(ext.review.commerce_description).toBeUndefined();
    expect(ext.publication.release_notes).toBeTruthy();
  });

  it('review cases are five positive and three negative, in the listing shape', () => {
    expect(cfg.chatgpt.testCases.positive).toHaveLength(5);
    expect(cfg.chatgpt.testCases.negative).toHaveLength(3);
    for (const c of [...cfg.chatgpt.testCases.positive, ...cfg.chatgpt.testCases.negative]) {
      expect(typeof c.description).toBe('string');
      expect(typeof c.prompt).toBe('string');
      expect(Array.isArray(c.tools_triggered)).toBe(true);
      expect(typeof c.expected_behavior).toBe('string');
    }
  });

  it('openaiExtensions omits the review and publication blocks when the config lacks them', () => {
    const ext = openaiExtensions({ ...cfg, chatgpt: undefined });
    expect(ext).not.toHaveProperty('review');
    expect(ext).not.toHaveProperty('publication');
    expect(ext.interface).not.toHaveProperty('privacyPolicyURL');
  });

  it('server.json matches the release version and the live remote, and the listing copy is identical', () => {
    const server = JSON.parse(read('server.json'));
    expect(server.version).toBe(version);
    expect(server.remotes[0].url).toBe(cfg.mcp.url);
    expect(server.description.length).toBeLessThanOrEqual(100);
    expect(read('docs/listing/server.json')).toBe(read('server.json'));
  });

  it('the square PNG icon for the Anthropic form is 512 by 512', () => {
    const png = readFileSync(`${ROOT}plugins/kernelcad/assets/logo.png`);
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
  });
});
