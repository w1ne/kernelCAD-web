import { useState, useEffect, useRef } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { llmService } from './LLMService';

export function FloatingAgent() {
    const { code, setCode, insertCode, selectedItemId } = useWorkbench();
    const [isVisible, setIsVisible] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewCode, setPreviewCode] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle Visibility with Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsVisible(prev => !prev);
                // Focus input when opening
                if (!isVisible) {
                    setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
            // Close on Escape
            if (e.key === 'Escape' && isVisible) {
                setIsVisible(false);
                setPreviewCode(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible]);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;
        setIsLoading(true);
        setPreviewCode(null);

        try {
            // Use same context logic as AIAssistant
            const response = await llmService.sendMessage(
                [{ role: 'user', content: input }],
                { code, selectedId: selectedItemId || undefined, style: 'Standard' } // Default style for now
            );

            // Extract code
            const match = /```javascript\n([\s\S]*?)\n```/.exec(response);
            const genCode = match ? match[1] : response; // Fallback to raw if no block

            setPreviewCode(genCode);

        } catch (error) {
            console.error(error);
            alert("Agent failed: " + error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (previewCode) {
            insertCode(previewCode);
            setIsVisible(false);
            setPreviewCode(null);
            setInput('');
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] bg-[#1e1e1e]/90 backdrop-blur-md border border-[#444] rounded-lg shadow-2xl z-50 text-white overflow-hidden">
            <div className="p-4 flex gap-2 items-center border-b border-[#333]">
                <span className="text-blue-400 font-bold">✨ AI</span>
                <input
                    ref={inputRef}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
                    placeholder="Ask AI to modify code or create geometry..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                />
                {isLoading && <span className="animate-spin">⏳</span>}
            </div>

            {previewCode && (
                <div className="p-4 bg-black/50 max-h-[300px] overflow-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-400">PREVIEW</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setCode(previewCode); setIsVisible(false); }}
                                className="text-red-400 hover:text-red-300 text-xs uppercase font-bold"
                            >
                                Replace All
                            </button>
                            <button
                                onClick={handleApply}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs"
                            >
                                Insert
                            </button>
                        </div>
                    </div>
                    <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
                        {previewCode}
                    </pre>
                </div>
            )}

            <div className="bg-[#252526] p-2 text-[10px] text-gray-500 flex justify-between px-4">
                <span>Cmd+K to Close</span>
                <span>Enter to Submit</span>
            </div>
        </div>
    );
}
