// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Small badge with the model's mechanism verdict: "Motion checked" (green),
// "Motion not checked" (grey, neutral) or "Mechanism broken" (red). The
// tooltip says what ran, what was skipped, or which joints fail. Static
// models get no badge. It only shows a verdict; it never blocks a save.

import type { JSX } from 'react';
import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { Badge, Tooltip, type TooltipSide } from '../../../ui';
import type { MechanismVerdictSummary } from '../../../modeling/runtime/mechanismVerdict';
import { motionBadgeModel, type MotionBadgeTone } from './motionBadgeModel';

const ICON: Record<MotionBadgeTone, JSX.Element> = {
    ok: <CheckCircle2 />,
    neutral: <CircleSlash />,
    danger: <XCircle />,
};

export interface MotionBadgeProps {
    readonly summary: MechanismVerdictSummary | null | undefined;
    readonly className?: string;
    /** Tooltip side; 'top' suits the bottom status bar. */
    readonly side?: TooltipSide;
}

export function MotionBadge({ summary, className, side = 'top' }: MotionBadgeProps): JSX.Element | null {
    const model = motionBadgeModel(summary);
    if (!model) return null;
    return (
        <Tooltip label={model.statement} description={model.lines.join('\n')} side={side}>
            <button
                type="button"
                aria-label={`${model.label}. ${model.statement}`}
                data-testid="motion-badge"
                data-verdict={summary?.verdict}
                className={`inline-flex cursor-default rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${className ?? ''}`}
            >
                <Badge tone={model.tone} icon={ICON[model.tone]}>{model.label}</Badge>
            </button>
        </Tooltip>
    );
}
