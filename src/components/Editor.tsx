import Editor from "@monaco-editor/react";
import type { EditorLike } from '../types/editor';

interface CodeEditorProps {
    value: string;
    onChange: (val: string | undefined) => void;
    onMount?: (editor: EditorLike) => void;
}

export default function CodeEditor({ value, onChange, onMount }: CodeEditorProps) {
    return (
        <div className="w-full h-full border-r border-[#333]">
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={value}
                onChange={onChange}
                onMount={(editor) => onMount?.(editor as unknown as EditorLike)}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 },
                }}
            />
        </div>
    );
}
