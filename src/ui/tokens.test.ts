// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AA_LARGE_OR_UI, AA_TEXT, contrastRatio } from './contrast';

// Reads the real stylesheet, so the check can never drift from the values
// that ship. A token change that breaks AA fails here.
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');

function block(selectorStart: string): Record<string, string> {
    const at = css.indexOf(selectorStart);
    if (at < 0) throw new Error(`no ${selectorStart} block in index.css`);
    const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
    const out: Record<string, string> = {};
    for (const m of body.matchAll(/--kc-([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) out[m[1]] = m[2];
    return out;
}

const THEMES = {
    light: block(':root,\n[data-theme="light"]'),
    dark: block('[data-theme="dark"] {'),
};

type Pair = readonly [fg: string, bg: string, min: number];

const SURFACES = ['bg', 'surface-1', 'surface-2'] as const;
const TEXT = ['fg', 'fg-2', 'fg-3', 'accent', 'agent-fg', 'ok', 'warn', 'danger'] as const;

const PAIRS: Pair[] = [
    // Body text of every role on every surface text sits on.
    ...TEXT.flatMap((t) => SURFACES.map((s) => [t, s, AA_TEXT] as const)),
    // Primary and secondary text also on pressed/selected rows.
    ['fg', 'surface-3', AA_TEXT],
    ['fg-2', 'surface-3', AA_TEXT],
    // Filled buttons, idle and hover.
    ['on-accent', 'accent', AA_TEXT],
    ['on-accent', 'accent-hover', AA_TEXT],
    ['on-danger', 'danger', AA_TEXT],
    ['on-danger', 'danger-hover', AA_TEXT],
    ['on-agent', 'agent', AA_TEXT],
    ['on-agent', 'agent-hover', AA_TEXT],
    // Badges: tone text on its soft fill.
    ['accent', 'accent-soft', AA_TEXT],
    ['ok', 'ok-soft', AA_TEXT],
    ['warn', 'warn-soft', AA_TEXT],
    ['danger', 'danger-soft', AA_TEXT],
    ['agent-fg', 'agent-soft', AA_TEXT],
    ['fg-2', 'surface-2', AA_TEXT],
    // UI outlines: focus ring and input borders.
    ['accent', 'bg', AA_LARGE_OR_UI],
    ['accent', 'surface-1', AA_LARGE_OR_UI],
    ['border-strong', 'bg', AA_LARGE_OR_UI],
    ['border-strong', 'surface-1', AA_LARGE_OR_UI],
    // Agent fill must read as a control on the page.
    ['agent', 'bg', AA_LARGE_OR_UI],
];

describe('design tokens', () => {
    it('defines the same token names in both themes', () => {
        expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(THEMES.light).sort());
        expect(Object.keys(THEMES.light).length).toBeGreaterThan(20);
    });

    for (const [theme, tokens] of Object.entries(THEMES)) {
        describe(`${theme} theme`, () => {
            it.each(PAIRS)('%s on %s meets %s:1', (fg, bg, min) => {
                expect(tokens[fg], `--kc-${fg}`).toBeDefined();
                expect(tokens[bg], `--kc-${bg}`).toBeDefined();
                expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
            });
        });
    }

    it('keeps copper for the agent only: danger is not copper', () => {
        for (const tokens of Object.values(THEMES)) {
            expect(tokens.danger.toLowerCase()).not.toBe(tokens.agent.toLowerCase());
            expect(tokens['danger-soft'].toLowerCase()).not.toBe(tokens['agent-soft'].toLowerCase());
        }
    });

    it('brand ink-faint passes AA on vellum (was #97A0AC at 2.25:1)', () => {
        const faint = /--color-ink-faint:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
        const vellum = /--color-vellum:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
        expect(faint).toBe(THEMES.light['fg-3']);
        expect(contrastRatio(faint!, vellum!)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('maps every semantic colour into Tailwind', () => {
        for (const name of Object.keys(THEMES.light)) {
            expect(css, `--color-${name}`).toContain(`--color-${name}: var(--kc-${name});`);
        }
    });
});
