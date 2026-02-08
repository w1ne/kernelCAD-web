import { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';

interface Reference {
    id: string;
    name: string;
    data: {
        origin: [number, number, number];
        normal: [number, number, number];
    };
}

export function MidplanePanel() {
    const {
        selectedFace,
        geometries,
        codeContext,
        insertCode,
        addPlane
    } = useWorkbench();
    const { closePanel } = useUI();

    const [ref1, setRef1] = useState<Reference | null>(null);
    const [ref2, setRef2] = useState<Reference | null>(null);
    const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

    // Auto-populate active slot from selection
    useEffect(() => {
        if (!selectedFace) return;

        const { faceId, shapeIndex } = selectedFace;
        const geometry = geometries[shapeIndex];
        const face = geometry?.faces.find(f => f.faceId === faceId);

        if (face && face.plane) {
            const item: Reference = {
                id: `face-${shapeIndex}-${faceId}`,
                name: `Face ${faceId} (${codeContext.getVariableAtIndex(shapeIndex) || 'shape'})`,
                data: {
                    origin: face.plane.origin,
                    normal: face.plane.normal
                }
            };

            /* eslint-disable react-hooks/set-state-in-effect */
            if (activeSlot === 1) {
                setRef1(current => (current?.id === item.id ? current : item));
                setActiveSlot(current => (current === 2 ? current : 2));
            } else {
                setRef2(current => (current?.id === item.id ? current : item));
            }
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [selectedFace, geometries, activeSlot, codeContext]);

    const handleCreate = () => {
        if (!ref1 || !ref2) return;

        const o1 = ref1.data.origin;
        const n1 = ref1.data.normal;
        const o2 = ref2.data.origin;
        const n2 = ref2.data.normal;

        // Midpoint origin
        const origin: [number, number, number] = [
            (o1[0] + o2[0]) / 2,
            (o1[1] + o2[1]) / 2,
            (o1[2] + o2[2]) / 2
        ];

        // Normal: bisector logic
        let finalNormal: [number, number, number] = [...n1];
        const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];

        if (Math.abs(dot) > 0.99) {
            // Parallel: use n1 (or flip if needed, but for midplane n1 is fine)
            finalNormal = [...n1];
        } else {
            // Bisector: normalize(n1 + n2)
            // Note: handles cases where they are not parallel
            const sum: [number, number, number] = [n1[0] + n2[0], n1[1] + n2[1], n1[2] + n2[2]];
            const len = Math.sqrt(sum[0] ** 2 + sum[1] ** 2 + sum[2] ** 2);
            if (len > 0.001) {
                finalNormal = [sum[0] / len, sum[1] / len, sum[2] / len];
            }
        }

        const uniqueName = codeContext.generateUniqueName('midplane');
        const planeCode = createPlaneConstructorCode(origin, finalNormal);

        insertCode(`const ${uniqueName} = ${planeCode};\n`);
        addPlane({
            id: uniqueName,
            name: `Midplane`,
            type: 'midplane',
            origin,
            normal: finalNormal,
            visible: true
        });

        closePanel('midplane');
    };

    return (
        <div className="flex flex-col gap-4 p-1">
            <p className="text-[11px] text-zinc-500 mb-1">Select two faces to create a plane between them.</p>

            {/* Slot 1 */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">First Reference</label>
                <button
                    type="button"
                    onClick={() => setActiveSlot(1)}
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-left transition-all ${activeSlot === 1
                        ? 'border-selection-blue bg-selection-blue/10 ring-1 ring-selection-blue/30'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                >
                    <div className={`h-2 w-2 rounded-full ${ref1 ? 'bg-selection-blue' : 'bg-zinc-700'}`} />
                    <span className={`text-sm flex-1 truncate ${ref1 ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                        {ref1 ? ref1.name : "Click a face in viewer..."}
                    </span>
                    {ref1 && (
                        <span
                            onClick={(e) => { e.stopPropagation(); setRef1(null); setActiveSlot(1); }}
                            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                        >
                            &times;
                        </span>
                    )}
                </button>
            </div>

            {/* Slot 2 */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Second Reference</label>
                <button
                    type="button"
                    onClick={() => setActiveSlot(2)}
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-left transition-all ${activeSlot === 2
                        ? 'border-selection-blue bg-selection-blue/10 ring-1 ring-selection-blue/30'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                >
                    <div className={`h-2 w-2 rounded-full ${ref2 ? 'bg-selection-blue' : 'bg-zinc-700'}`} />
                    <span className={`text-sm flex-1 truncate ${ref2 ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                        {ref2 ? ref2.name : "Click a face in viewer..."}
                    </span>
                    {ref2 && (
                        <span
                            onClick={(e) => { e.stopPropagation(); setRef2(null); setActiveSlot(2); }}
                            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                        >
                            &times;
                        </span>
                    )}
                </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
                <button
                    type="button"
                    onClick={() => closePanel('midplane')}
                    className="rounded px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={!ref1 || !ref2}
                    onClick={handleCreate}
                    className="rounded bg-selection-blue px-6 py-2 text-xs font-bold text-black hover:bg-selection-blue/90 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-selection-blue/20"
                >
                    Create
                </button>
            </div>
        </div>
    );
}
