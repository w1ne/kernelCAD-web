// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { parseCode } from './ast';

export type CodeTransform = (prev: string) => string;

type SetCodeState = (updater: (prev: string) => string) => void;

export interface CodeMutationDiagnostics {
  attempts: number;
  succeeded: number;
  failed: number;
}

export class CodeMutationService {
  private readonly setCodeState: SetCodeState;
  private diagnostics: CodeMutationDiagnostics = {
    attempts: 0,
    succeeded: 0,
    failed: 0,
  };

  constructor(setCodeState: SetCodeState) {
    this.setCodeState = setCodeState;
  }

  apply(transform: CodeTransform, mutationName: string): void {
    this.diagnostics.attempts += 1;
    this.setCodeState((prev) => {
      try {
        const next = transform(prev);
        parseCode(next);
        this.diagnostics.succeeded += 1;
        return next;
      } catch (e) {
        console.error(`${mutationName} failed; keeping previous code`, e);
        this.diagnostics.failed += 1;
        return prev;
      }
    });
  }

  getDiagnostics(): Readonly<CodeMutationDiagnostics> {
    return { ...this.diagnostics };
  }

  resetDiagnostics(): void {
    this.diagnostics = {
      attempts: 0,
      succeeded: 0,
      failed: 0,
    };
  }

  replace(nextCode: string, mutationName: string): void {
    this.apply(() => nextCode, mutationName);
  }

  appendSnippet(snippet: string, mutationName: string): void {
    this.apply((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed + (trimmed ? '\n' : '') + snippet;
    }, mutationName);
  }
}
