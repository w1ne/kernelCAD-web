import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface DialogField {
    label: string;
    key: string;
    defaultValue: number;
    step?: number;
}

interface ParameterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: Record<string, number>) => void;
    title: string;
    fields: DialogField[];
}

export default function ParameterDialog({ isOpen, onClose, onSubmit, title, fields }: ParameterDialogProps) {
    const [values, setValues] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        fields.forEach(f => {
            initial[f.key] = f.defaultValue;
        });
        return initial;
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(values);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-80 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#222]">
                    <h3 className="text-sm font-bold text-gray-200 uppercase">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-xs text-gray-400 block">{field.label}</label>
                            <input
                                type="number"
                                step={field.step || 1}
                                value={values[field.key] || ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) }))}
                                className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    ))}

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        >
                            Insert
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
