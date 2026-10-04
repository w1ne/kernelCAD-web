// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import {
    AGENT_PANE_WIDTH,
    agentPaneWidthForKey,
    clampAgentPaneWidth,
    readStoredAgentPaneWidth,
    writeStoredAgentPaneWidth,
} from '../logic/agentPaneWidth';

afterEach(() => localStorage.clear());

describe('agent pane width', () => {
    it('is 360 px by default and stays between 280 and 560 px', () => {
        expect(AGENT_PANE_WIDTH.default).toBe(360);
        expect(clampAgentPaneWidth(100)).toBe(280);
        expect(clampAgentPaneWidth(900)).toBe(560);
        expect(clampAgentPaneWidth(Number.NaN)).toBe(360);
        expect(clampAgentPaneWidth(401.6)).toBe(402);
    });

    it('widens with ArrowRight (the pane is on the left) and jumps with Home/End', () => {
        expect(agentPaneWidthForKey(360, 'ArrowRight')).toBe(376);
        expect(agentPaneWidthForKey(360, 'ArrowLeft')).toBe(344);
        expect(agentPaneWidthForKey(552, 'ArrowRight')).toBe(560);
        expect(agentPaneWidthForKey(360, 'Home')).toBe(280);
        expect(agentPaneWidthForKey(360, 'End')).toBe(560);
        expect(agentPaneWidthForKey(360, 'Enter')).toBeNull();
    });

    it('persists the chosen width per browser, clamped', () => {
        expect(readStoredAgentPaneWidth()).toBe(360);
        writeStoredAgentPaneWidth(420);
        expect(readStoredAgentPaneWidth()).toBe(420);
        localStorage.setItem('kernelcad:agentPaneWidth', '9000');
        expect(readStoredAgentPaneWidth()).toBe(560);
    });
});
