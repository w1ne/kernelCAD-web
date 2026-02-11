import { useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { generateSketchOnFaceCode } from '../../features/core/sketchOnFace.feature';
import type { SketchData } from '../../types/sketch';
import type { SketchPlaneEntity } from '../../types/plane';
import { BaseFormPanel, type FormValues } from '../Forms';
import { createSketchOnFaceSchema } from '../Forms/schemas';

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

    const shapeName = useMemo(() =>
        codeContext.getVariableAtIndex(selectedFace?.shapeIndex ?? -1) || 'Anonymous Shape',
        [codeContext, selectedFace]);

    const faceId = selectedFace?.faceId ?? -1;

    const schema = useMemo(() =>
        createSketchOnFaceSchema(shapeName, faceId),
        [shapeName, faceId]);

    const handleConfirm = (values: FormValues) => {
        if (!selectedFace) return;

        const name = values.name as string;
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
        <BaseFormPanel
            schema={schema}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('sketchOnFace')}
        />
    );
}
