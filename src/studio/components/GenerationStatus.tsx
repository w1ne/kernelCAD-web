// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';
import type { GenerationResolution } from '../hooks/useGenerationReview';

/**
 * Staged/discarded confirmations under the review gate, plus the terminal
 * generation error line.
 */
export function GenerationStatus({
    phase,
    reviewing,
    resolution,
}: {
    phase: GenerationPhase;
    reviewing: boolean;
    resolution: GenerationResolution | null;
}) {
    return (
        <>
            {phase.state === 'done' && !reviewing && resolution?.action === 'staged' && (
                <div className="text-[10px] text-green-500 truncate" aria-live="polite">
                    ✓ staged for review — {phase.artifact.title}
                </div>
            )}
            {phase.state === 'done' && !reviewing && resolution?.action === 'discarded' && (
                <div className="text-[10px] text-gray-500 truncate" aria-live="polite">
                    discarded — {phase.artifact.title}
                </div>
            )}
            {phase.state === 'error' && (
                <div className="text-[10px] text-red-400" aria-live="polite">
                    {phase.code === 'rate_limited'
                        ? 'Rate limit reached — try again in a minute.'
                        : `Didn't finish: ${phase.message.slice(0, 140)}`}
                </div>
            )}
        </>
    );
}
