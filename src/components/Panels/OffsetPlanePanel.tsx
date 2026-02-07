import React, { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';

export function OffsetPlanePanel() {
    const {
        planes,
        selectedFace,
        setPreviewCode,
        geometries,
        codeContext,
        insertCode,
        addPlane
    } = useWorkbench();
    const { closePanel } = useUI();

    // Determine initial selection
    const getInitialPlaneId = () => {
        if (selectedFace) {
            return `face-${selectedFace.faceId}`;
        }
        return planes.length > 0 ? planes[0].id : '';
    };

    const [baseRefId, setBaseRefId] = useState(getInitialPlaneId());
    const [offset, setOffset] = useState(0);

    // Live Preview Effect (Future: Implement plane ghosting)
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!baseRefId) return;

        if (baseRefId.startsWith('face-')) {
            const faceId = parseInt(baseRefId.replace('face-', '').split('-')[0]);
            if (selectedFace && selectedFace.faceId === faceId && geometries[selectedFace.shapeIndex]) {
                const { shapeIndex } = selectedFace;
                const geometry = geometries[shapeIndex];
                const face = geometry.faces.find(f => f.faceId === faceId);

                if (face && face.plane) {
                    let targetName = codeContext.getVariableAtIndex(shapeIndex) || 'shape';
                    if (targetName === 'unknown') targetName = 'shape';
                    const uniqueName = codeContext.generateUniqueName(`plane_${targetName}_face${faceId}`);

                    let planeCode = createPlaneConstructorCode(face.plane.origin, face.plane.normal);
                    let finalOrigin = [...face.plane.origin];

                    if (offset !== 0) {
                        const [ox, oy, oz] = face.plane.origin;
                        const [nx, ny, nz] = face.plane.normal;
                        finalOrigin = [ox + nx * offset, oy + ny * offset, oz + nz * offset];
                        planeCode = createPlaneConstructorCode(finalOrigin as [number, number, number], face.plane.normal);
                    }

                    insertCode(`const ${uniqueName} = ${planeCode};\n`);
                    addPlane({
                        id: uniqueName,
                        name: offset === 0 ? `Datum (Face ${faceId})` : `Offset ${offset} (Face ${faceId})`,
                        type: 'face',
                        origin: finalOrigin as [number, number, number],
                        normal: face.plane.normal,
                        visible: true,
                        parentId: targetName
                    });
                }
            }
        } else {
            const basePlane = planes.find(p => p.id === baseRefId);
            if (basePlane) {
                const [ox, oy, oz] = basePlane.origin;
                const [nx, ny, nz] = basePlane.normal;
                const newOrigin: [number, number, number] = [
                    ox + nx * offset,
                    oy + ny * offset,
                    oz + nz * offset
                ];
                const uniqueName = codeContext.generateUniqueName('plane_offset');
                insertCode(`const ${uniqueName} = ${createPlaneConstructorCode(newOrigin, basePlane.normal)};\n`);
                addPlane({
                    id: uniqueName,
                    name: basePlane.type === 'base' ? `Offset Plane ${planes.length - 2}` : `Offset from ${basePlane.name}`,
                    type: 'offset',
                    origin: newOrigin,
                    normal: [...basePlane.normal] as [number, number, number],
                    visible: true,
                    parentId: baseRefId
                });
            }
        }

        closePanel('offsetPlane');
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Reference Selection */}
            <div className="flex flex-col gap-1">
                <label htmlFor="plane-base" className="text-xs font-medium text-zinc-400">Reference Entity</label>
                <select
                    id="plane-base"
                    value={baseRefId}
                    onChange={(e) => setBaseRefId(e.target.value)}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    required
                >
                    <option value="" disabled>Select a plane or face...</option>
                    <optgroup label="Standard Planes">
                        {planes.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} {p.type === 'base' ? '(Origin)' : ''}</option>
                        ))}
                    </optgroup>
                    {selectedFace && (
                        <optgroup label="Selection">
                            <option value={`face-${selectedFace.faceId}`}>
                                Selected Face {selectedFace.faceId}
                            </option>
                        </optgroup>
                    )}
                </select>
            </div>

            {/* Offset Distance */}
            <div className="flex flex-col gap-1">
                <label htmlFor="plane-offset" className="text-xs font-medium text-zinc-400">Offset Distance (mm)</label>
                <input
                    id="plane-offset"
                    type="number"
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                    className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-zinc-200 focus:border-selection-blue focus:outline-none focus:ring-1 focus:ring-selection-blue"
                    step="1"
                    autoFocus
                />
            </div>

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={() => closePanel('offsetPlane')}
                    className="rounded px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="rounded bg-selection-blue/20 border border-selection-blue/20 px-4 py-1.5 text-xs font-medium text-selection-blue hover:bg-selection-blue/30 transition-colors shadow-[0_0_10px_rgba(46,196,182,0.2)]"
                >
                    Create Plane
                </button>
            </div>
        </form>
    );
}
