import { useWorkbench } from '../context/WorkbenchContext';
import { generateUniqueName } from '../lib/codeAnalysis';
import { InsertShapeCommand } from '../commands/implementations/InsertShapeCommand';

export function useCodeInsertion() {
    const { editorInstance, commandManager } = useWorkbench();

    const insertCode = (inputSnippet: string | ((name: string) => string), baseName = 'shape') => {
        if (!editorInstance) return;

        const model = editorInstance.getModel();
        const currentCode = model.getValue();

        // 1. Determine variable name
        const varName = generateUniqueName(currentCode, baseName);
        const snippet = typeof inputSnippet === 'function' ? inputSnippet(varName) : inputSnippet;

        // Check if this is a Shape declaration (Command Pattern with AST)
        // Simple heuristic: starts with declaration keyword
        if (/^\s*(const|let|var)\s+/.test(snippet)) {
            try {
                commandManager.execute(new InsertShapeCommand(snippet, `Insert ${baseName}`));
                editorInstance.focus();
                return;
            } catch (e) {
                console.error("Command execution failed, falling back to legacy insertion", e);
            }
        }

        // --- Legacy Insertion for Modifiers (.fillet) or Fallback ---
        // Note: This path is only used for non-declaration snippets like ".fillet(1)"
        // Shape declarations should use AST Command Pattern above

        // 2. Determine insertion position
        let position = editorInstance.getPosition();

        // If cursor is at top (likely default) or unset, use line 1
        if (!position || position.lineNumber <= 1) {
            position = { lineNumber: 1, column: 1 };
        }

        if (!position) return;

        // 3. Smart newline logic
        const lineContent = model.getLineContent(position.lineNumber);
        const isLineEmpty = lineContent.trim().length === 0;

        let textToInsert = snippet;
        const isStatement = /^(const|let|var|function|return)/.test(snippet);
        // If inserting a statement on a non-empty line, prepend newline
        if (!isLineEmpty && isStatement) {
            textToInsert = '\n' + snippet;
        }

        // 4. Insert the snippet (modifiers like .fillet don't need return updates)
        editorInstance.executeEdits('toolbar', [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            },
            text: textToInsert,
            forceMoveMarkers: true
        }]);

        editorInstance.focus();
    };

    return { insertCode };
}
