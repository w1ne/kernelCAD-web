// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

interface AISettingsPanelProps {
    apiKey: string;
    onApiKeyChange: (value: string) => void;
    onSaveKey: () => void;
    style: string;
    onStyleChange: (value: string) => void;
}

export function AISettingsPanel({ apiKey, onApiKeyChange, onSaveKey, style, onStyleChange }: AISettingsPanelProps) {
    return (
        <div className="p-4 bg-surface-2 border-b border-border">
            <label className="block text-xs uppercase text-fg-3 mb-1">xAI API Key (Grok)</label>
            <input
                type="password"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="w-full bg-surface-1 border border-border-strong p-2 text-sm rounded mb-2 text-white"
                placeholder="xai-..."
            />
            <button
                onClick={onSaveKey}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded"
            >
                Save Key
            </button>

            <div className="mt-4 border-t border-border pt-4">
                <label className="block text-xs uppercase text-fg-3 mb-1">Design Persona</label>
                <select
                    value={style}
                    onChange={(e) => onStyleChange(e.target.value)}
                    className="w-full bg-surface-1 border border-border-strong p-2 text-sm rounded text-white focus:outline-none"
                >
                    <option value="Standard">Standard (Balanced)</option>
                    <option value="Industrial">Industrial (Robust, Chamfered)</option>
                    <option value="Minimalist">Minimalist (Smooth, Apple-like)</option>
                    <option value="Organic">Organic (Curvy, Biological)</option>
                </select>
            </div>
        </div>
    );
}
