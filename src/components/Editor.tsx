import Editor from "@monaco-editor/react";

interface CodeEditorProps {
    value: string;
    onChange: (val: string | undefined) => void;
}

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
    return (
        <div className="w-full h-full border-r border-[#333]">
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={value}
                onChange={onChange}
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
