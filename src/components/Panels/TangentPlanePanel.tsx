import { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';

interface Reference {
    id: string;
    name: string;
    cylinder: {
        origin: [number, number, number];
        axis: [number, number, number];
        radius: number;
    };
}

export function TangentPlanePanel() {
    const {
        selectedFace,
        geometries,
        codeContext,
        insertCode,
        addPlane
    } = useWorkbench();
    const { closePanel } = useUI();

    const [ref1, setRef1] = useState<Reference | null>(null);
    const [angle, setAngle] = useState(0);

    // Auto-populate from selection
    useEffect(() => {
        if (!selectedFace) return;

        const { faceId, shapeIndex } = selectedFace;
        const geometry = geometries[shapeIndex];
        const face = geometry?.faces.find(f => f.faceId === faceId);

        if (face && face.cylinder) {
            const nextRef: Reference = {
                id: `face-${shapeIndex}-${faceId}`,
                name: `Cyl Face ${faceId}`,
                cylinder: face.cylinder
            };
            /* eslint-disable react-hooks/set-state-in-effect */
            setRef1(current => (current?.id === nextRef.id ? current : nextRef));
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [selectedFace, geometries]);

    const handleCreate = () => {
        if (!ref1) return;

        const { origin: cOrg, axis: cAxis, radius } = ref1.cylinder;

        // Compute local coordinate system
        // Create an arbitrary perpendicular vector to serve as "0 degrees"
        // If axis is parallel to Z, pick X. Else pick cross(axis, Z).
        const axisLen = Math.sqrt(cAxis[0] ** 2 + cAxis[1] ** 2 + cAxis[2] ** 2);
        const axisNorm: [number, number, number] = [cAxis[0] / axisLen, cAxis[1] / axisLen, cAxis[2] / axisLen];

        let refX: [number, number, number] = [1, 0, 0];
        if (Math.abs(axisNorm[0]) > 0.9 && Math.abs(axisNorm[1]) < 0.1 && Math.abs(axisNorm[2]) < 0.1) {
            // axis is roughly X, use Y as ref
            refX = [0, 1, 0];
        }

        // Project refX onto plane perpendicular to axis
        // v_perp = v - project(v_on_axis)
        // project(a_on_b) = (a . b_unit) * b_unit
        const dot = refX[0] * axisNorm[0] + refX[1] * axisNorm[1] + refX[2] * axisNorm[2];
        let pX: [number, number, number] = [
            refX[0] - dot * axisNorm[0],
            refX[1] - dot * axisNorm[1],
            refX[2] - dot * axisNorm[2]
        ];

        // Normalize pX
        const lenPX = Math.sqrt(pX[0] ** 2 + pX[1] ** 2 + pX[2] ** 2);
        if (lenPX < 0.0001) {
            // Fallback (e.g. use Z)
            refX = [0, 0, 1];
            const dot2 = refX[0] * axisNorm[0] + refX[1] * axisNorm[1] + refX[2] * axisNorm[2];
            pX = [
                refX[0] - dot2 * axisNorm[0],
                refX[1] - dot2 * axisNorm[1],
                refX[2] - dot2 * axisNorm[2]
            ];
            const lenPX2 = Math.sqrt(pX[0] ** 2 + pX[1] ** 2 + pX[2] ** 2);
            pX = [pX[0] / lenPX2, pX[1] / lenPX2, pX[2] / lenPX2];
        } else {
            pX = [pX[0] / lenPX, pX[1] / lenPX, pX[2] / lenPX];
        }

        // Calculate rotated vector for angle
        // We can use a rotation matrix around axis
        // Or construct local basis (pX, pY, axis)
        const pY: [number, number, number] = [
            axisNorm[1] * pX[2] - axisNorm[2] * pX[1],
            axisNorm[2] * pX[0] - axisNorm[0] * pX[2],
            axisNorm[0] * pX[1] - axisNorm[1] * pX[0]
        ];

        const rads = (angle * Math.PI) / 180;
        const cos = Math.cos(rads);
        const sin = Math.sin(rads);

        const radialDir: [number, number, number] = [
            cos * pX[0] + sin * pY[0],
            cos * pX[1] + sin * pY[1],
            cos * pX[2] + sin * pY[2]
        ];

        // Tangent Plane Origin = Cylinder Origin + Radius * RadialDir
        const planeOrigin: [number, number, number] = [
            cOrg[0] + radius * radialDir[0],
            cOrg[1] + radius * radialDir[1],
            cOrg[2] + radius * radialDir[2]
        ];

        // Tangent Plane Normal = RadialDir (facing outward)
        const planeNormal = radialDir;

        const uniqueName = codeContext.generateUniqueName('tan_plane');
        const planeCode = createPlaneConstructorCode(planeOrigin, planeNormal);

        insertCode(`const ${uniqueName} = ${planeCode};\n`);
        addPlane({
            id: uniqueName,
            name: `Tangent Plane (${angle}°)`,
            type: 'tangent',
            origin: planeOrigin,
            normal: planeNormal,
            visible: true
        });

        closePanel('tangentPlane');
    };

    return (
        <div className="flex flex-col gap-4 p-1">
            <p className="text-[11px] text-zinc-500 mb-1">Select a cylindrical face to create a tangent plane.</p>

            {/* Selection Slot */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cylindrical Face</label>
                <div
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-left transition-all ${ref1
                        ? 'border-selection-blue bg-selection-blue/10 ring-1 ring-selection-blue/30'
                        : 'border-white/5 bg-white/5'
                        }`}
                >
                    <div className={`h-2 w-2 rounded-full ${ref1 ? 'bg-selection-blue' : 'bg-red-500'}`} />
                    <span className={`text-sm flex-1 truncate ${ref1 ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                        {ref1 ? ref1.name : "Select a cylinder..."}
                    </span>
                    {ref1 && (
                        <span
                            onClick={(e) => { e.stopPropagation(); setRef1(null); }}
                            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none cursor-pointer"
                        >
                            &times;
                        </span>
                    )}
                </div>
            </div>

            {/* Angle Slider */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <label htmlFor="tp-angle" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Angle (°)</label>
                    <span className="text-xs text-zinc-300 font-mono">{angle}°</span>
                </div>
                <input
                    id="tp-angle"
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-full accent-selection-blue h-1 rounded-full bg-white/10 appearance-none cursor-grab active:cursor-grabbing"
                />
                <div className="flex justify-between text-[9px] text-zinc-600 px-1">
                    <span>0</span>
                    <span>90</span>
                    <span>180</span>
                    <span>270</span>
                    <span>360</span>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
                <button
                    type="button"
                    onClick={() => closePanel('tangentPlane')}
                    className="rounded px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={!ref1}
                    onClick={handleCreate}
                    className="rounded bg-selection-blue px-6 py-2 text-xs font-bold text-black hover:bg-selection-blue/90 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-selection-blue/20"
                >
                    Create
                </button>
            </div>
        </div>
    );
}
