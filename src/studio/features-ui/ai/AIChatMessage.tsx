// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import Markdown from 'react-markdown';
import type { ChatMessage } from './LLMService';
import type { Variation } from './useAIAssistantChat';

interface AIChatMessageProps {
    msg: ChatMessage;
    applyCodeSafe: (code: string) => Promise<boolean>;
    insertCode: (code: string) => void;
    handleRunCode: (code: string) => void;
}

function AIVariationsMessage({ msg, applyCodeSafe, handleRunCode }: AIChatMessageProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs text-purple-400 font-bold mb-1">✨ DESIGN VARIATIONS</div>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(() => {
                    try {
                        const variations = JSON.parse(msg.content) as Variation[];
                        return variations.map((v: Variation, vIdx: number) => (
                            <div key={vIdx} className="min-w-[200px] bg-black/50 p-2 rounded border border-[#444] flex flex-col gap-2">
                                <div className="font-bold text-sm text-gray-200">{v.name}</div>
                                <div className="text-[10px] text-gray-400 leading-tight h-10 overflow-hidden">{v.description}</div>
                                <div className="flex gap-1 mt-auto">
                                    <button
                                        onClick={() => applyCodeSafe(v.code)}
                                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] py-1 rounded"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={() => handleRunCode(v.code)}
                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] py-1 rounded"
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                        ));
                    } catch {
                        return <div>Error parsing variations</div>;
                    }
                })()}
            </div>
        </div>
    );
}

function AIMarkdownMessage({ msg, applyCodeSafe, insertCode, handleRunCode }: AIChatMessageProps) {
    return (
        <Markdown
            components={{
                code({ children, className }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isBlock = match && match[1] === 'javascript';

                    if (isBlock) {
                        const codeString = String(children).replace(/\n$/, '');
                        return (
                            <div className="relative group my-2">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (confirm('Replace entire editor content?')) {
                                                await applyCodeSafe(codeString);
                                            }
                                        }}
                                        className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1"
                                        title="Replace entire script"
                                    >
                                        ⚡ REPLACE
                                    </button>
                                    <button
                                        onClick={() => insertCode(codeString)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1"
                                        title="Insert at cursor"
                                    >
                                        ⬇ INSERT
                                    </button>
                                    <button
                                        onClick={() => handleRunCode(codeString)}
                                        className="bg-green-600 hover:bg-green-500 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1"
                                        title="Run this code (Preview)"
                                    >
                                        ▶ RUN
                                    </button>
                                </div>
                                <code className={`${className} block bg-black/50 p-2 rounded text-xs overflow-x-auto`}>
                                    {children}
                                </code>
                            </div>
                        )
                    }
                    return <code className="bg-black/30 px-1 rounded text-xs">{children}</code>
                }
            }}
        >
            {msg.content}
        </Markdown>
    );
}

/** Renders a single chat message: either a design-variations card row (JSON
 *  array content) or a markdown message with runnable code blocks. */
export function AIChatMessage(props: AIChatMessageProps) {
    const { msg } = props;
    const isVariations = msg.role === 'model'
        && msg.content.trim().startsWith('[')
        && msg.content.trim().endsWith(']');
    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded p-3 ${msg.role === 'user' ? 'bg-blue-900/30 border border-blue-800' : 'bg-[#252526] border border-[#333]'
                }`}>
                {isVariations ? <AIVariationsMessage {...props} /> : <AIMarkdownMessage {...props} />}
            </div>
        </div>
    );
}
