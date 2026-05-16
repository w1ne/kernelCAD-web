import { useState, useEffect, useRef } from 'react';
import { agentAPI } from '../../../agent/api';
import Markdown from 'react-markdown';
import { llmService, type ChatMessage } from './LLMService';

import { useWorkbench } from '../../context/WorkbenchContext';

interface Variation {
    name: string;
    code: string;
    description: string;
}

export function AIAssistant() {
    const { code, insertCode, selectedItemId, applyCodeSafe } = useWorkbench();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(llmService.getApiKey() || '');
    const [showSettings, setShowSettings] = useState(!llmService.getApiKey());
    const [style, setStyle] = useState('Standard');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Pass context (code + selection + style) to the LLM
            const responseText = await llmService.sendMessage(
                [...messages, userMsg],
                { code, selectedId: selectedItemId || undefined, style }
            );
            const aiMsg: ChatMessage = { role: 'model', content: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setMessages(prev => [...prev, { role: 'model', content: `**Error**: ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVariations = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: `✨ Generate Variations: ${input}` };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const variations = await llmService.generateVariations(
                input, // Original prompt
                { code, style }
            );
            // Store as JSON string in message content for rendering
            const aiMsg: ChatMessage = { role: 'model', content: JSON.stringify(variations) };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setMessages(prev => [...prev, { role: 'model', content: `**Error**: ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveKey = () => {
        llmService.setApiKey(apiKey);
        setShowSettings(false);
    };

    const handleRunCode = async (code: string) => {
        try {
            await agentAPI.evaluateCode(code);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(e);
            alert("Execution failed: " + message);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // Send immediately with prompt
                handleSendWithImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendWithImage = async (imageBase64: string) => {
        if (isLoading) return;
        const prompt = input.trim() || "Describe this image and generate geometry for it.";

        const userMsg: ChatMessage = { role: 'user', content: `[Image Uploaded] ${prompt}` };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await llmService.sendMessage(
                [...messages, userMsg],
                { code, selectedId: selectedItemId || undefined, style, image: imageBase64 }
            );
            const aiMsg: ChatMessage = { role: 'model', content: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setMessages(prev => [...prev, { role: 'model', content: `**Error**: ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

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

            {/* Settings Overlay */}
            {showSettings && (
                <div className="p-4 bg-[#252526] border-b border-[#333]">
                    <label className="block text-xs uppercase text-gray-500 mb-1">xAI API Key (Grok)</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-[#111] border border-[#333] p-2 text-sm rounded mb-2 text-white"
                        placeholder="xai-..."
                    />
                    <button
                        onClick={handleSaveKey}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded"
                    >
                        Save Key
                    </button>

                    <div className="mt-4 border-t border-[#333] pt-4">
                        <label className="block text-xs uppercase text-gray-500 mb-1">Design Persona</label>
                        <select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] p-2 text-sm rounded text-white focus:outline-none"
                        >
                            <option value="Standard">Standard (Balanced)</option>
                            <option value="Industrial">Industrial (Robust, Chamfered)</option>
                            <option value="Minimalist">Minimalist (Smooth, Apple-like)</option>
                            <option value="Organic">Organic (Curvy, Biological)</option>
                        </select>
                    </div>
                </div>
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
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded p-3 ${msg.role === 'user' ? 'bg-blue-900/30 border border-blue-800' : 'bg-[#252526] border border-[#333]'
                            }`}>
                            {/* Check if message content is JSON (Variations) */}
                            {msg.role === 'model' && msg.content.trim().startsWith('[') && msg.content.trim().endsWith(']') ? (
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
                            ) : (
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
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
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
        </div>
    );
}
