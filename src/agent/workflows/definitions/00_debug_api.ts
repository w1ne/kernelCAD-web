// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { WorkflowDefinition } from '../registry';

export const debugApi: WorkflowDefinition = {
    id: 'debug-api',
    name: 'Debug API Check',
    description: 'Inspects Sketcher prototype and keys',
    code: `
	const { Sketcher } = replicad;
	const __DEBUG__ = typeof process !== 'undefined' && process?.env?.KERNELCAD_TEST_LOG === '1';
	if (__DEBUG__) console.log("Debug: Sketcher prototype keys:", Object.getOwnPropertyNames(Sketcher.prototype));
	
	const s = new Sketcher();
	if (__DEBUG__) console.log("Debug: Sketcher instance keys:", Object.keys(s));
	if (__DEBUG__) console.log("Debug: Sketcher instance proto keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(s)));
	if (__DEBUG__) console.log("Debug: Is circle a function?", typeof s.circle);
	
	return s.close().extrude(10);
	`,
    expected: {
        error: /No lines to convert into a wire/
    }
};
