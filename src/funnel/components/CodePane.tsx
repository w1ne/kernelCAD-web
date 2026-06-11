// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import Editor from '@monaco-editor/react';

export interface CodePaneProps {
  code: string;
  language?: string;
}

export function CodePane({ code, language = 'typescript' }: CodePaneProps) {
  return (
    <div className="w-full h-full border-l border-rule">
      {/* Code label — matches marketing site's .code-label style */}
      <div className="font-mono text-[11px] text-ink-soft tracking-widest uppercase px-4 py-2 bg-vellum-soft border-b border-rule">
        .kcad.ts
      </div>
      <Editor
        height="calc(100% - 33px)"
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
