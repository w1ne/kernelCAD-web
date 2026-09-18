// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SketchGeometry } from "../../../../shared/worker/geometryEngine";
import { SketchLine } from "../entities/SketchLine";

type ContextMenuRequest = {
    visible: boolean;
    position: { x: number; y: number } | null;
    type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH';
};

interface SketchLayerProps {
    sketchesGeometries: SketchGeometry[];
    hiddenIds: string[];
    selectedSketchName: string | null;
    selectedItemIds: string[];
    toggleSelection: (id: string, multi: boolean) => void;
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    setSelectedSketchName: (name: string | null) => void;
    setSelectedItemId: (id: string | null) => void;
    setContextMenu: (menu: ContextMenuRequest) => void;
}

/**
 * Renders every visible sketch as a clickable line with the same selection
 * and context-menu handling Viewer had inline.
 */
export function SketchLayer({
    sketchesGeometries,
    hiddenIds,
    selectedSketchName,
    selectedItemIds,
    toggleSelection,
    setSelectedFace,
    setSelectedSketchName,
    setSelectedItemId,
    setContextMenu,
}: SketchLayerProps) {
    return (
        <group>
            {sketchesGeometries.filter(s => !hiddenIds.includes(s.name)).map((s) => (
                <SketchLine
                    key={s.id}
                    sketch={s}
                    isSelected={selectedSketchName === s.name || selectedItemIds.includes(s.name)}
                    onClick={(e) => {
                        const isMulti = e ? (e.metaKey || e.ctrlKey || e.shiftKey) : false;
                        if (isMulti) {
                            toggleSelection(s.name, true);
                            return;
                        }

                        setSelectedFace(null);
                        setSelectedSketchName(s.name);
                        setSelectedItemId(s.name);

                        if (e) {
                            const x = e.nativeEvent.clientX;
                            const y = e.nativeEvent.clientY;
                            setContextMenu({
                                visible: true,
                                position: { x, y },
                                type: 'SKETCH'
                            });
                        }
                    }}
                />
            ))}
        </group>
    );
}
