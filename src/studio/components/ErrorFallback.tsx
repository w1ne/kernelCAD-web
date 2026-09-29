// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { AlertTriangle, Copy, Download, RefreshCw } from 'lucide-react';
import { useWorkbench } from '../context/WorkbenchContext';

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
    const { code } = useWorkbench();

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        alert('Code copied to clipboard');
    };

    const handleDownloadCode = () => {
        const blob = new Blob([code], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rescued-model-${new Date().toISOString()}.js`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-[#111] text-white p-8 overflow-hidden font-sans">
            <div className="max-w-3xl w-full bg-[#1e1e1e] border border-red-900/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-red-900/20 border-b border-red-900/50 p-6 flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 rounded-full shrink-0">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-red-400">Application Crashed</h1>
                        <p className="text-gray-400 mt-1">
                            An unexpected error occurred in the workbench. Don't worry, your code is safe.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Code Rescue Section */}
                    <div className="bg-[#111] rounded-lg border border-[#333] p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                                Code Rescue
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyCode}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] rounded text-sm transition-colors text-gray-200"
                                >
                                    <Copy size={14} />
                                    Copy Code
                                </button>
                                <button
                                    onClick={handleDownloadCode}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] rounded text-sm transition-colors text-gray-200"
                                >
                                    <Download size={14} />
                                    Download Backup
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <pre className="text-xs font-mono text-gray-500 bg-black/50 p-3 rounded h-32 overflow-hidden opacity-75 select-none pointer-events-none">
                                {code.slice(0, 500)}
                                {code.length > 500 && '\n... (remaining code preserved)'}
                            </pre>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        </div>
                    </div>

                    {/* Error Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Error Details</h3>
                        <div className="bg-black/50 rounded-lg border border-red-900/30 p-4 font-mono text-xs overflow-auto max-h-48 text-red-300">
                            <div className="font-bold mb-2">{error.toString()}</div>
                            <div className="opacity-75 whitespace-pre-wrap">{error.stack}</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#252525] border-t border-[#333] p-4 flex justify-end gap-3">
                    <button
                        onClick={resetErrorBoundary}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                    >
                        <RefreshCw size={16} />
                        Reload Application
                    </button>
                </div>
            </div>
        </div>
    );
}
