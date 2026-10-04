// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure helpers of the command palette.
import type { Command } from '../hooks/useCommandRegistry';

/** cmdk identifies items by value; keep equal labels apart. */
export function uniqueValues(commands: readonly Command[]): Map<string, string> {
    const seen = new Set<string>();
    const values = new Map<string, string>();
    for (const c of commands) {
        const value = seen.has(c.label) ? `${c.label} ${c.id}` : c.label;
        seen.add(c.label);
        values.set(c.id, value);
    }
    return values;
}

function wordStarts(text: string, token: string): boolean {
    return text.split(/[^a-z0-9]+/).some((word) => word.startsWith(token));
}

/** Characters of `token` appear in `text` in order. */
function isSubsequence(text: string, token: string): boolean {
    let i = 0;
    for (const ch of text) {
        if (ch === token[i]) i += 1;
        if (i === token.length) return true;
    }
    return false;
}

function tokenScore(label: string, keywords: readonly string[], token: string): number {
    if (label.startsWith(token)) return 1;
    if (wordStarts(label, token)) return 0.9;
    if (label.includes(token)) return 0.7;
    if (keywords.some((k) => wordStarts(k, token))) return 0.6;
    if (keywords.some((k) => k.includes(token))) return 0.4;
    // Typo-tolerant only on the label, so keywords do not add noise.
    if (token.length >= 2 && isSubsequence(label, token)) return 0.2;
    return 0;
}

/**
 * Palette search score in 0..1; 0 hides the item. Every word of the query
 * must match: a label prefix scores highest, then a word start or substring
 * of the label, then a keyword, then the query letters in order in the label.
 */
export function scoreCommand(label: string, search: string, keywords: readonly string[] = []): number {
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 1;
    const text = label.toLowerCase();
    const words = keywords.map((k) => k.toLowerCase());
    let total = 0;
    for (const token of tokens) {
        const s = tokenScore(text, words, token);
        if (s === 0) return 0;
        total += s;
    }
    return total / tokens.length;
}

/** The commands that match `search`, best first; ties keep their order. */
export function rankCommands(commands: readonly Command[], search: string): Command[] {
    return commands
        .map((command, index) => ({
            command,
            index,
            score: scoreCommand(command.label, search, [...(command.keywords ?? []), ...(command.description ? [command.description] : [])]),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map((r) => r.command);
}
