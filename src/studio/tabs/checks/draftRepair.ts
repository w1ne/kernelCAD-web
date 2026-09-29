// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ValiditySuggestionCard } from '../../adapters/validitySuggestions';
import { shellStore } from '../../store/useShellStore';

/**
 * "Fix with agent": select the target, put the card's repair prompt in the
 * agent composer, record the repair workflow (so a recheck can say "Fixed"
 * or "Still failing") and open the agent rail.
 */
export function draftRepair(
    card: ValiditySuggestionCard,
    validityFingerprint: string,
    onSelect: (() => void) | undefined,
): void {
    onSelect?.();
    shellStore.setAgentDraftPrompt(card.promptText);
    shellStore.setAgentRepairWorkflow({
        cardId: card.id,
        code: card.code,
        promptText: card.promptText,
        targetId: card.targetId,
        targetIds: card.targetIds,
        promptSource: card.promptSource,
        validityFingerprint,
        state: 'drafted',
    });
    shellStore.setAgentRailOpen(true);
}

/** Copy a repair prompt for an agent outside the Studio. Resolves false when the clipboard is unavailable. */
export async function copyPrompt(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
