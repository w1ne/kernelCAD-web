// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    code: string;
    inputs?: Record<string, unknown>;
    expected: {
        volume?: number;
        faceCount?: number;
        edgeCount?: number;
        boundingBox?: { min: [number, number, number], max: [number, number, number] };
        sketchCount?: number;
        error?: string | RegExp;
        timeoutMs?: number;
    };
}

const workflows: WorkflowDefinition[] = [];

export function registerWorkflow(workflow: WorkflowDefinition) {
    workflows.push(workflow);
}

export function getWorkflows() {
    return workflows;
}
