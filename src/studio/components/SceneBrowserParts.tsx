// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import type { HistoryItem } from '../../shared/codeGeneration/codeAnalysis';

export interface SceneContextMenuState {
    readonly x: number;
    readonly y: number;
    readonly item: HistoryItem;
}

interface SceneContextMenuProps {
    readonly contextMenu: SceneContextMenuState | null;
    readonly items: HistoryItem[];
    readonly hiddenIds: string[];
    readonly onDelete?: (item: HistoryItem) => void;
    readonly onToggleVisibility: (id: string) => void;
    readonly onRename?: (oldName: string, newName: string) => void;
    readonly onClose: () => void;
}

export function SceneContextMenu({
    contextMenu,
    items,
    hiddenIds,
    onDelete,
    onToggleVisibility,
    onRename,
    onClose,
}: SceneContextMenuProps): JSX.Element | null {
    if (!contextMenu) return null;
    return contextMenu && (
                <div
                    className="fixed z-50 bg-[#222] border border-[#444] rounded shadow-xl py-1 min-w-[120px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            onDelete?.(contextMenu.item);
                            onClose();
                        }}
                    >
                        Delete
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            onToggleVisibility(contextMenu.item.name);
                            // Plus hide others... (Isolate logic)
                            items.forEach(it => {
                                if (it.name !== contextMenu.item.name && !hiddenIds.includes(it.name)) {
                                    onToggleVisibility(it.name);
                                }
                            });
                            onClose();
                        }}
                    >
                        Isolate
                    </button>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            // Show all hidden items
                            hiddenIds.forEach(id => {
                                onToggleVisibility(id);
                            });
                            onClose();
                        }}
                    >
                        Show All
                    </button>
                    <div className="border-t border-[#444] my-1"></div>
                    <button
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-600 text-gray-200"
                        onClick={() => {
                            const newName = window.prompt("Rename variable:", contextMenu.item.name);
                            if (newName && newName !== contextMenu.item.name && onRename) {
                                onRename(contextMenu.item.name, newName);
                            }
                            onClose();
                        }}
                    >
                        Rename...
                    </button>
                </div>
    );
}
