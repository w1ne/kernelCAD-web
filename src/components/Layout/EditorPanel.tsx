

import CodeEditor from '../Editor';
import { AlertCircle } from 'lucide-react';

interface EditorPanelProps {
    code: string;
    onChange: (value: string) => void;
    onMount: (editor: any) => void;
    error: string | null;
    visible: boolean;
}

export function EditorPanel({ code, onChange, onMount, error, visible }: EditorPanelProps) {
    if (!visible) return null;

    return (
        <div className="flex-1 h-full relative">
            <CodeEditor
                value={code}
                onChange={(v) => onChange(v || '')}
                onMount={onMount}
            />
            {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700/50 shadow-xl backdrop-blur-md text-xs font-mono flex gap-2 items-start pointer-events-none">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
            )}
        </div>
    );
}
