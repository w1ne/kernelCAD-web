import Editor from "@monaco-editor/react";

interface CodeEditorProps {
    value: string;
    onChange: (val: string | undefined) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMount?: (editor: any) => void;
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
                onMount={onMount}
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
