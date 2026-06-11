// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { X, Plus, Trash2, FolderOpen, Edit2, Check, Clock } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface ProjectManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProjectManagerDialog({ isOpen, onClose }: ProjectManagerDialogProps) {
    const { projects, activeProjectId, openProject, createProject, deleteProject, renameActiveProject } = useProject();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    if (!isOpen) return null;

    const handleRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const saveRename = () => {
        if (editingId === activeProjectId) {
            renameActiveProject(editName);
        } else {
            // For now, we only rename the active one in the context helper, 
            // but we could extend the context to rename any project.
            // Simplified for now.
        }
        setEditingId(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
                    <div className="flex items-center gap-3">
                        <FolderOpen className="text-blue-500 w-5 h-5" />
                        <h2 className="text-lg font-semibold text-white">Project Manager</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <button
                        onClick={() => createProject()}
                        className="w-full py-3 border-2 border-dashed border-[#333] hover:border-blue-500/50 hover:bg-blue-500/5 flex items-center justify-center gap-2 rounded-xl text-gray-400 hover:text-blue-400 transition-all group"
                    >
                        <Plus size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Create New Project</span>
                    </button>

                    <div className="grid gap-3">
                        {projects.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).map((project) => (
                            <div
                                key={project.id}
                                className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${activeProjectId === project.id
                                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                    : 'bg-[#222] border-[#333] hover:border-[#444]'
                                    }`}
                            >
                                <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                                    {editingId === project.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                                                className="bg-[#333] border border-blue-500 rounded px-2 py-0.5 text-white outline-none w-full"
                                            />
                                            <button onClick={saveRename} className="text-green-500 hover:text-green-400">
                                                <Check size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-medium text-white truncate cursor-pointer hover:text-blue-400 transition-colors"
                                                onClick={() => {
                                                    openProject(project.id);
                                                    onClose();
                                                }}
                                            >
                                                {project.name}
                                            </span>
                                            {activeProjectId === project.id && (
                                                <button
                                                    onClick={() => handleRename(project.id, project.name)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatDate(project.lastUpdated)}
                                        </span>
                                        {activeProjectId === project.id && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider text-[9px]">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            openProject(project.id);
                                            onClose();
                                        }}
                                        disabled={activeProjectId === project.id}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeProjectId === project.id
                                            ? 'bg-blue-500/20 text-blue-400 cursor-default'
                                            : 'bg-[#333] text-gray-300 hover:bg-[#444] hover:text-white'
                                            }`}
                                    >
                                        {activeProjectId === project.id ? 'Open' : 'Switch'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete project "${project.name}"?`)) {
                                                deleteProject(project.id);
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#151515] border-t border-[#333] text-[11px] text-gray-500 italic">
                    All projects are stored locally in your browser.
                </div>
            </div>
        </div>
    );
}
