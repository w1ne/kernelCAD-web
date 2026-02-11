import { useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';
import { BaseFormPanel, type FormValues, type FormSchema } from '../Forms';

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

    // Build dynamic options for plane selection
    const planeOptions = useMemo(() => {
        const options = planes.map(p => ({
            value: p.id,
            label: `${p.name}${p.type === 'base' ? ' (Origin)' : ''}`
        }));

        if (selectedFace) {
            options.push({
                value: `face-${selectedFace.faceId}`,
                label: `Selected Face ${selectedFace.faceId}`
            });
        }
        return options;
    }, [planes, selectedFace]);

    // Determine initial plane selection
    const initialPlaneId = useMemo(() => {
        return selectedFace
            ? `face-${selectedFace.faceId}`
            : (planes.length > 0 ? planes[0].id : '');
    }, [selectedFace, planes]);

    const schema: FormSchema = useMemo(() => ({
        title: 'Construction Plane',
        fields: [
            {
                name: 'basePlaneId',
                label: 'Reference Entity',
                type: 'select',
                options: planeOptions,
                defaultValue: initialPlaneId,
                required: true,
            },
            {
                name: 'distance',
                label: 'Distance (mm)',
                type: 'number',
                defaultValue: 10,
                step: 1,
                id: 'offset-distance'
            },
        ],
    }), [planeOptions, initialPlaneId]);

    const handleConfirm = (values: FormValues) => {
        const baseRefId = values.basePlaneId as string;
        const distance = values.distance as number;

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

                    if (distance !== 0) {
                        const [ox, oy, oz] = face.plane.origin;
                        const [nx, ny, nz] = face.plane.normal;
                        finalOrigin = [ox + nx * distance, oy + ny * distance, oz + nz * distance];
                        planeCode = createPlaneConstructorCode(finalOrigin as [number, number, number], face.plane.normal);
                    }

                    insertCode(`const ${uniqueName} = ${planeCode};\n`);
                    addPlane({
                        id: uniqueName,
                        name: distance === 0 ? `Datum (Face ${faceId})` : `Offset ${distance} (Face ${faceId})`,
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
                    ox + nx * distance,
                    oy + ny * distance,
                    oz + nz * distance
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

    const handlePreview = (values: FormValues) => {
        const baseRefId = values.basePlaneId as string;

        if (!baseRefId) {
            setPreviewCode(null);
            return;
        }

        // Simplistic preview: just show a plane at the origin/offset
        // We could reuse logic from handleConfirm but without insert/add
        // For now, let's keep it simple as before
    };

    return (
        <BaseFormPanel
            schema={schema}
            initialValues={{
                basePlaneId: initialPlaneId,
                distance: 10
            }}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('offsetPlane')}
            onChange={handlePreview}
            submitLabel="Create Plane"
        />
    );
}
