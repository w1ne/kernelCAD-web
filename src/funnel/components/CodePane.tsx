import Editor from '@monaco-editor/react';

export interface CodePaneProps {
  code: string;
  language?: string;
}

export function CodePane({ code, language = 'typescript' }: CodePaneProps) {
  return (
    <div className="w-full h-full border-l border-neutral-800">
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
