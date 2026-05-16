import { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { llmService } from './LLMService';


export function SmartWidget() {
    const { selectedItemId, code, applyCodeSafe } = useWorkbench();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Close when selection changes
    useEffect(() => {
        setIsOpen(false);
        setInput('');
    }, [selectedItemId]);

    if (!selectedItemId) return null;

    const handleKeydown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && input.trim()) {
            setIsLoading(true);
            try {
                const prompt = `
                User selected object "${selectedItemId}". 
                Request: ${input}.
                
                TASK:
                The current code is provided in the context.
                Rewrite the COMPLETE code to apply this change to "${selectedItemId}".
                Ensure you return a valid, complete script that exports the main function or returns the shapes.
                Top-level "const" definitions cannot be redeclared, so just return the fully rewritten file content.
                `;

                const response = await llmService.sendMessage(
                    [{ role: 'user', content: prompt }],
                    { code, selectedId: selectedItemId, style: 'Standard' }
                );

                // Extract code
                const match = /```javascript\n([\s\S]*?)\n```/.exec(response);
                if (match) {
                    const newCode = match[1];

                    // Validate and Apply
                    const success = await applyCodeSafe(newCode);
                    if (success) {
                        setIsOpen(false);
                        setInput('');
                    } else {
                        // Alert is handled by applyCodeSafe, but we could add a "Retry" UI here later
                    }
                }
            } catch (err) {
                console.error(err);
                alert("AI Error: " + err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="absolute bottom-10 right-10 z-50 flex flex-col items-end gap-2">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold animate-bounce"
                >
                    <span>✨</span>
                    <span>Modify Selection</span>
                </button>
            )}

            {isOpen && (
                <div className="bg-[#1e1e1e] border border-[#444] p-3 rounded-lg shadow-xl w-64 backdrop-blur-md">
                    <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">
                        Editing: <span className="text-white font-mono">{selectedItemId}</span>
                    </div>
                    <input
                        autoFocus
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeydown}
                        placeholder="e.g. Round edges, Make hole..."
                        className="w-full bg-[#111] border border-[#333] rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                    {isLoading && <div className="text-xs text-blue-400 mt-1">Generating...</div>}
                </div>
            )}
        </div>
    );
}
