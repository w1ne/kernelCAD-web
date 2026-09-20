// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { agentAPI } from '../../../agent/api';
import { llmService, type ChatMessage } from './LLMService';
import { useWorkbench } from '../../context/WorkbenchContext';

export interface Variation {
    name: string;
    code: string;
    description: string;
}

/**
 * Owns the AI Assistant's chat state, settings, and the send/variation/
 * image handlers. Split out of `AIAssistant.tsx` so the component file is
 * JSX composition only.
 */
export function useAIAssistantChat() {
    const { code, insertCode, selectedItemId, applyCodeSafe } = useWorkbench();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(llmService.getApiKey() || '');
    const [showSettings, setShowSettings] = useState(!llmService.getApiKey());
    const [style, setStyle] = useState('Standard');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleRunCode = async (codeToRun: string) => {
        try {
            await agentAPI.evaluateCode(codeToRun);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(e);
            alert("Execution failed: " + message);
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

    return {
        messages,
        input,
        setInput,
        isLoading,
        apiKey,
        setApiKey,
        showSettings,
        setShowSettings,
        style,
        setStyle,
        messagesEndRef,
        fileInputRef,
        handleSend,
        handleGenerateVariations,
        handleSaveKey,
        handleRunCode,
        handleFileSelect,
        insertCode,
        applyCodeSafe,
    };
}
