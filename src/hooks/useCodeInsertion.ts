import { useWorkbench } from '../context/WorkbenchContext';
import { generateUniqueName, findInsertionPoint, updateReturnStatement } from '../lib/codeAnalysis';
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

        // Check if this is a Shape declaration (Command Pattern)
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

        // 2. Determine insertion position
        // Only use current position if it's "meaningful" (not line 1, column 1 usually)
        let position = editorInstance.getPosition();

        // If cursor is at top (likely default) or unset, use smart detection
        if (!position || position.lineNumber <= 1) {
            const line = findInsertionPoint(currentCode);
            position = { lineNumber: line, column: 1 };
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

        // 4. Prepare Edits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const edits: any[] = [];

        // Edit 1: Insert the snippet
        edits.push({
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            },
            text: textToInsert,
            forceMoveMarkers: true
        });

        // Edit 2: Update return statement
        if (isStatement && !snippet.startsWith('.')) {
            // We only attempt to update the return if we can find it reliably
            const matches = model.findMatches('return\\s+[^;]+;?', false, true, false, null, true);
            // exclude 'return drawPart()' which is usually at the bottom
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const validMatch = matches.find((m: any) => !m.matches[0].includes('drawPart('));

            if (validMatch) {
                const originalReturn = validMatch.matches[0];
                const updatedReturn = updateReturnStatement(originalReturn, varName);
                if (updatedReturn !== originalReturn) {
                    edits.push({
                        range: validMatch.range,
                        text: updatedReturn,
                        forceMoveMarkers: false
                    });
                }
            }
        }

        editorInstance.executeEdits('toolbar', edits);
        editorInstance.focus();
    };

    return { insertCode };
}
