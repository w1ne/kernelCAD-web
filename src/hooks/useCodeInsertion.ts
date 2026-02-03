import { useWorkbench } from '../context/WorkbenchContext';
import { InsertShapeCommand } from '../commands/implementations/InsertShapeCommand';

export function useCodeInsertion() {
    const { editorInstance, commandManager, codeContext } = useWorkbench();

    const insertCode = (inputSnippet: string | ((name: string) => string), baseName = 'shape') => {
        if (!editorInstance) return;

        const model = editorInstance.getModel();
        if (!model) return;

        // 1. Determine variable name
        const varName = codeContext.generateUniqueName(baseName);
        const snippet = typeof inputSnippet === 'function' ? inputSnippet(varName) : inputSnippet;

        // Check if this is a Shape declaration (Command Pattern with AST)
        // Strip leading comments to properly detect declarations
        const trimmedSnippet = snippet.replace(/^(\s*\/\/.*\n|\s*\/\*[\s\S]*?\*\/\n?)*/g, '').trim();

        if (/^(const|let|var)\s+/.test(trimmedSnippet)) {
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
