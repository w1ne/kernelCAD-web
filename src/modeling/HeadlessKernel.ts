import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';

let isInitialized = false;

export async function initHeadless() {
    if (isInitialized) return;
    // In Node.js, this loads the WASM. 
    // In Browser, this might load from URL, but we are designing this for Node agent.

    console.log("HeadlessKernel: replicad-opencascadejs import type:", typeof opencascade);
    console.log("HeadlessKernel: replicad-opencascadejs import value:", opencascade);

    let OC;
    if (typeof opencascade === 'function') {
        OC = await (opencascade as unknown as () => Promise<unknown>)();
    } else if (opencascade && typeof (opencascade as { default?: () => Promise<unknown> }).default === 'function') {
        OC = await (opencascade as { default: () => Promise<unknown> }).default();
    } else {
        throw new Error("Could not find opencascade factory function");
    }

    replicad.setOC(OC);
    isInitialized = true;
}

import type { HeadlessContext } from './features/types';
import { CodeAnalyzer } from '../lib/codeGeneration/CodeAnalyzer';
import type { CodeGenerationContext } from '../lib/codeGeneration';

export interface ExecutionResult {
    shape?: unknown; // Replicad shape
    logs: string[];
    errors: string[];
}

export class HeadlessKernel implements HeadlessContext {
    private context: { replicad: typeof replicad; console: Record<string, unknown> };
    private analyzer: CodeAnalyzer;
    code: string = "";

    constructor() {
        this.context = {
            replicad,
            console: {
                log: (...args: unknown[]) => this.logs.push(args.map(String).join(' ')),
                error: (...args: unknown[]) => this.errors.push(args.map(String).join(' ')),
                warn: (...args: unknown[]) => this.logs.push('WARN: ' + args.map(String).join(' ')),
            }
        };
        this.analyzer = new CodeAnalyzer(this.code);
    }

    private logs: string[] = [];
    private errors: string[] = [];

    // HeadlessContext implementation
    insertCode(snippet: string | ((name: string) => string), baseName?: string) {
        if (typeof snippet === 'function') {
            const name = baseName || 'var';
            this.code += '\n' + snippet(name);
        } else {
            this.code += '\n' + snippet;
        }
        this.analyzer.updateCode(this.code);
    }

    setCode(code: string) {
        this.code = code;
        this.analyzer.updateCode(code);
    }

    mutateCode(transform: (prev: string) => string): void {
        const next = transform(this.code);
        this.setCode(next);
    }

    get codeContext(): CodeGenerationContext {
        return this.analyzer.createContext();
    }

    // Dummy UI methods for compatibility with FeatureContext
    setActiveDialog() { }
    openPanel() { }
    closePanel() { }

    async initialize() {
        await initHeadless();
    }

    executeCode(code: string): ExecutionResult {
        this.logs = [];
        this.errors = [];

        // Update internal code state if this is a full replacement
        // Note: This needs better logic for partial updates in real agent scenarios
        this.code = code;

        try {
            // Function constructor to sandbox basic execution
            // Note: This is NOT secure sandbox, but sufficient for internal agent
            const func = new Function(
                'replicad',
                'console',
                `"use strict";
                try {
                    ${code}
                } catch (e) {
                    throw e;
                }
                `
            );

            const result = func(this.context.replicad, this.context.console);
            return {
                shape: result,
                logs: this.logs,
                errors: this.errors
            };
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            this.errors.push(msg);
            // @ts-expect-error - logging
            this.context.console.error("Execution Error:", msg);

            return {
                shape: undefined,
                logs: this.logs,
                errors: this.errors
            };
        }
    }
}
