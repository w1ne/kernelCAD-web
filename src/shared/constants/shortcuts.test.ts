// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { KEYMAP, SHORTCUT_HELP, shortcutCombo } from './shortcuts';

describe('shortcutCombo', () => {
    it('builds the combo string the keyboard hook matches', () => {
        expect(shortcutCombo(KEYMAP.commandPalette)).toBe('mod+k');
        expect(shortcutCombo(KEYMAP.toggleInspector)).toBe('mod+\\');
        expect(shortcutCombo(KEYMAP.redo)).toBe('mod+shift+z');
        // Modifier order follows the hook, not the input order.
        expect(shortcutCombo(['Shift', 'Mod', 'P'])).toBe('mod+shift+p');
        expect(shortcutCombo(KEYMAP.close)).toBe('escape');
    });

    it('lists every bound shortcut in the help', () => {
        const listed = new Set(SHORTCUT_HELP.flatMap((row) => row.keys.map((k) => k.join('+'))));
        for (const keys of Object.values(KEYMAP)) expect(listed.has(keys.join('+'))).toBe(true);
    });
});
