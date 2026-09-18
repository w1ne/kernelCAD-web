// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';

/**
 * The single Studio > Generate prompt box. A fresh agent draft prompt wins
 * over the locally edited text until the user acknowledges that draft version
 * by editing the box.
 */
export function usePromptDraft(agentDraftPrompt: string | null, agentDraftPromptVersion: number) {
    const [editedPrompt, setEditedPrompt] = useState('');
    const [acknowledgedDraftVersion, setAcknowledgedDraftVersion] = useState(-1);

    const prompt =
        agentDraftPrompt !== null && agentDraftPromptVersion !== acknowledgedDraftVersion
            ? agentDraftPrompt
            : editedPrompt;

    const setPrompt = (nextPrompt: string) => {
        setAcknowledgedDraftVersion(agentDraftPromptVersion);
        setEditedPrompt(nextPrompt);
    };

    return { prompt, setPrompt };
}
