export type EditorPosition = { lineNumber: number; column: number };

export type EditorRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export interface EditorModelLike {
  getLineContent(lineNumber: number): string;
}

export type EditorEdit = {
  range: EditorRange;
  text: string;
  forceMoveMarkers?: boolean;
};

// Minimal surface we use from Monaco in this app.
// Keep this small so we don't couple the app to Monaco's full type tree.
export interface EditorLike {
  getModel(): EditorModelLike | null;
  getPosition(): EditorPosition | null;
  executeEdits(source: string, edits: EditorEdit[]): void;
  setPosition(position: EditorPosition): void;
  revealLineInCenter(lineNumber: number): void;
  focus(): void;
}
