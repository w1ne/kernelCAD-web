import { useWorkbench } from '../context/WorkbenchContext';
import { InsertShapeCommand } from '../commands/implementations/InsertShapeCommand';

export function useCodeInsertion() {
    const { editorInstance, commandManager, codeContext, setCode, code: currentCode } = useWorkbench();

    const insertCode = (inputSnippet: string | ((name: string) => string), baseName = 'shape') => {
        const varName = codeContext.generateUniqueName(baseName);
        const snippet = typeof inputSnippet === 'function' ? inputSnippet(varName) : inputSnippet;

        if (!editorInstance) {
            const trimmed = currentCode.trimEnd();
            const newCode = trimmed + (trimmed ? '\n' : '') + snippet;
            setCode(newCode);
            return;
        }

        const model = editorInstance.getModel();
        if (!model) {
            const trimmed = currentCode.trimEnd();
            const newCode = trimmed + (trimmed ? '\n' : '') + snippet;
            setCode(newCode);
            return;
        }

        // Check if this is a Shape declaration (Command Pattern with AST)
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

        let position = editorInstance.getPosition();
        if (!position || position.lineNumber <= 1) {
            position = { lineNumber: 1, column: 1 };
        }

        const lineContent = model.getLineContent(position.lineNumber);
        const isLineEmpty = lineContent.trim().length === 0;

        let textToInsert = snippet;
        const isStatement = /^(const|let|var|function|return)/.test(snippet);
        if (!isLineEmpty && isStatement) {
            textToInsert = '\n' + snippet;
        }

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
