// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useAIAssistantChat } from './useAIAssistantChat';
import { AISettingsPanel } from './AISettingsPanel';
import { AIChatMessage } from './AIChatMessage';

interface AIAssistantComposerProps {
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
    handleSend: () => void;
    handleGenerateVariations: () => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
}

/** Composer row: prompt textarea plus send / vision / variations actions. */
function AIAssistantComposer({
    input,
    setInput,
    isLoading,
    handleSend,
    handleGenerateVariations,
    fileInputRef,
}: AIAssistantComposerProps) {
    return (
        <div className="p-3 bg-[#252526] border-t border-[#333]">
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Describe geometry..."
                    className="flex-1 bg-[#111] border border-[#333] rounded p-2 text-sm text-white resize-none h-20 focus:outline-none focus:border-blue-500"
                />
                <div className="flex flex-col gap-1">
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 disabled:bg-gray-700 text-white px-3 py-2 rounded hover:bg-blue-500 transition-colors flex-1"
                        title="Send Message"
                    >
                        ➤
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded transition-colors text-xs font-bold"
                        title="Upload Image (Vision)"
                    >
                        📷
                    </button>
                    <button
                        onClick={handleGenerateVariations}
                        disabled={isLoading || !input.trim()}
                        className="bg-purple-600 disabled:bg-gray-700 text-white px-3 py-2 rounded hover:bg-purple-500 transition-colors text-xs font-bold"
                        title="Generate 3 Variations"
                    >
                        ✨
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AIAssistant() {
    const {
        messages, input, setInput, isLoading, apiKey, setApiKey, showSettings, setShowSettings,
        style, setStyle, messagesEndRef, fileInputRef, handleSend, handleGenerateVariations,
        handleSaveKey, handleRunCode, handleFileSelect, insertCode, applyCodeSafe,
    } = useAIAssistantChat();

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-200">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />

            {/* Header / Settings Toggle */}
            <div className="p-2 border-b border-[#333] flex justify-between items-center text-xs">
                <span className="font-bold text-gray-400">AI CONSULTANT</span>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-blue-400 hover:text-blue-300"
                >
                    {showSettings ? 'Close' : 'Settings'}
                </button>
            </div>

            {showSettings && (
                <AISettingsPanel
                    apiKey={apiKey}
                    onApiKeyChange={setApiKey}
                    onSaveKey={handleSaveKey}
                    style={style}
                    onStyleChange={setStyle}
                />
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
                {messages.length === 0 && !showSettings && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>Ask me to create geometry.</p>
                        <p className="text-xs mt-2">Example: "Create a cylinder with radius 5"</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <AIChatMessage
                        key={idx}
                        msg={msg}
                        applyCodeSafe={applyCodeSafe}
                        insertCode={insertCode}
                        handleRunCode={handleRunCode}
                    />
                ))}
                {isLoading && <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <AIAssistantComposer
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                handleSend={handleSend}
                handleGenerateVariations={handleGenerateVariations}
                fileInputRef={fileInputRef}
            />
        </div>
    );
}
