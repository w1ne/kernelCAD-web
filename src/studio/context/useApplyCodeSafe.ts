// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback } from 'react';

/**
 * Wraps `setCode` in an Agent-API validation gate: evaluates the candidate
 * code first and only commits it when the validator reports no errors.
 * Returns true if successful, false if validation failed.
 */
export function useApplyCodeSafe(setCode: (code: string) => void) {
    return useCallback(async (newCode: string): Promise<boolean> => {
        try {
            const { agentAPI } = await import('../../agent/api');
            const result = await agentAPI.evaluateCode(newCode);

            if (result.errors && result.errors.length > 0) {
                const msg = "AI Validation Failed:\n" + result.errors.join('\n');
                console.error(msg);
                alert(msg);
                return false;
            }

            setCode(newCode);
            return true;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error("Safety Check Error:", e);
            alert("Safety Check Error: " + message);
            return false;
        }
    }, [setCode]);
}
