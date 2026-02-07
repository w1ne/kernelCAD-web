import React, { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateSketchOnFaceCode } from '../../features/core/sketchOnFace.feature';
import type { SketchData } from '../../types/sketch';
import type { SketchPlaneEntity } from '../../types/plane';

export function SketchOnFacePanel() {
    const {
        selectedFace,
        codeContext,
        geometries,
        insertCode,
        addSketch,
        setSketchMode
    } = useWorkbench();
    const { closePanel } = useUI();

    const shapeName = codeContext.getVariableAtIndex(selectedFace?.shapeIndex ?? -1) || 'Anonymous Shape';
    const faceId = selectedFace?.faceId ?? -1;
    const defaultName = codeContext.generateUniqueName('sketch');

    const [name, setName] = useState(defaultName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFace) return;

        const targetName = codeContext.getVariableAtIndex(selectedFace.shapeIndex);
        const geometry = geometries[selectedFace.shapeIndex];
        const faceGeometry = geometry?.faces.find(f => f.faceId === selectedFace.faceId);
        const plane = faceGeometry?.plane;

        const snippet = generateSketchOnFaceCode(
            codeContext,
            targetName,
            selectedFace.faceId,
            name,
            plane ? {
                origin: plane.origin,
                normal: plane.normal,
                xDir: plane.xDir
            } : undefined
        );
        insertCode(snippet);

        if (faceGeometry && faceGeometry.plane) {
            const newSketch: SketchData = {
                id: name,
                name: name,
                plane: 'face',
                entities: [],
                closed: false,
                createdAt: Date.now()
            };
            addSketch(newSketch);
            const planeEntity: SketchPlaneEntity = {
                id: `plane_${name}`,
                name: targetName ? `Face ${selectedFace.faceId} of ${targetName}` : `Face ${selectedFace.faceId}`,
                type: 'face',
                origin: faceGeometry.plane.origin,
                normal: faceGeometry.plane.normal,
                visible: true,
                parentId: targetName || undefined,
                faceId: selectedFace.faceId
            };
            setSketchMode({
                active: true,
                currentSketch: newSketch,
                tool: 'line',
                plane: planeEntity
            });
        }

        closePanel('sketchOnFace');
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-[11px] text-zinc-400 bg-black/20 p-2 rounded border border-white/5">
                Sketching on <span className="text-selection-blue font-medium">{shapeName}</span> (Face {faceId})
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="sketch-name" className="text-xs font-medium text-zinc-400">
                    Sketch Name
                </label>
                <input
                    id="sketch-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    autoFocus
                />
            </div>

            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => closePanel('sketchOnFace')}
                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                >
                    Create Sketch
                </button>
            </div>
        </form>
    );
}
