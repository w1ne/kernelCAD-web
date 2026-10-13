// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
// @ts-expect-error plain .mjs script without type declarations
import { buildManifests, cursorDeeplink } from './buildManifests.mjs';

const root = resolve(__dirname, '..', '..');
const cfg = JSON.parse(readFileSync(join(root, 'agent-plugin.config.json'), 'utf8'));
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const files: Record<string, Record<string, unknown>> = buildManifests(cfg, version);

describe('agent plugin manifests', () => {
    it('committed manifests match agent-plugin.config.json', () => {
        for (const [rel, obj] of Object.entries(files)) {
            const text = readFileSync(join(root, rel), 'utf8');
            expect(text, `${rel} is stale; run node scripts/agentPlugin/buildManifests.mjs`).toBe(
                JSON.stringify(obj, null, 2) + '\n',
            );
        }
    });

    it('every manifest points at the hosted MCP, never a local command', () => {
        for (const [rel, obj] of Object.entries(files)) {
            const text = JSON.stringify(obj);
            expect(text, rel).not.toMatch(/"command"/);
            if (/mcp|gemini|\.claude-plugin\/plugin|\.cursor-plugin/.test(rel)) {
                expect(text, rel).toContain(cfg.mcp.url);
            }
        }
    });

    it('marketplace plugin sources resolve to the plugin dir and bundled skills exist', () => {
        expect(existsSync(join(root, cfg.pluginDir, 'skills'))).toBe(true);
        for (const name of ['kernelcad-design-loop', 'kernelcad-cookbooks', 'kernelcad-studio-paint', 'kernelcad-export']) {
            const skill = readFileSync(join(root, cfg.pluginDir, 'skills', name, 'SKILL.md'), 'utf8');
            expect(skill).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`));
        }
        expect(existsSync(join(root, 'skills', 'kernelcad-export', 'SKILL.md'))).toBe(true); // Gemini symlink
    });

    it('cursor deeplink encodes the hosted URL', () => {
        const link: string = cursorDeeplink(cfg);
        const config = decodeURIComponent(link.split('config=')[1]);
        expect(JSON.parse(Buffer.from(config, 'base64').toString())).toEqual({ url: cfg.mcp.url });
    });
});
