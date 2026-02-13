import { parseCode } from './ast';

export type CodeTransform = (prev: string) => string;

type SetCodeState = (updater: (prev: string) => string) => void;

export class CodeMutationService {
  private readonly setCodeState: SetCodeState;

  constructor(setCodeState: SetCodeState) {
    this.setCodeState = setCodeState;
  }

  apply(transform: CodeTransform, mutationName: string): void {
    this.setCodeState((prev) => {
      try {
        const next = transform(prev);
        parseCode(next);
        return next;
      } catch (e) {
        console.error(`${mutationName} failed; keeping previous code`, e);
        return prev;
      }
    });
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
