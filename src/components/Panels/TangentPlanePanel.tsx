import { useState, useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';
import { BaseFormPanel, type FormValues, type FormSchema } from '../Forms';

interface Reference {
    id: string;
    name: string;
    cylinder: {
        origin: [number, number, number];
        axis: [number, number, number];
        radius: number;
    };
}

const tangentPlaneSchema: FormSchema = {
    title: 'Tangent Plane',
    description: 'Select a cylindrical face to create a tangent plane.',
    fields: [
        {
            name: 'ref1',
            label: 'Cylindrical Face',
            type: 'selection-slot',
            placeholder: 'Select a cylinder...',
            required: true
        },
        {
            name: 'angle',
            label: 'Angle (°)',
            type: 'slider',
            min: 0,
            max: 360,
            step: 5,
            defaultValue: 0
        }
    ]
};

export function TangentPlanePanel() {
    const {
        selectedFace,
        geometries,
        codeContext,
        insertCode,
        addPlane
    } = useWorkbench();
    const { closePanel } = useUI();

    const [values, setValues] = useState<FormValues>({
        ref1: null,
        angle: 0
    });

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
            setValues(prev => ({ ...prev, ref1: nextRef }));
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [selectedFace, geometries]);

    const handleConfirm = (formValues: FormValues) => {
        const ref1 = formValues.ref1 as Reference;
        const angle = formValues.angle as number;
        if (!ref1) return;

        const { origin: cOrg, axis: cAxis, radius } = ref1.cylinder;

        const axisLen = Math.sqrt(cAxis[0] ** 2 + cAxis[1] ** 2 + cAxis[2] ** 2);
        const axisNorm: [number, number, number] = [cAxis[0] / axisLen, cAxis[1] / axisLen, cAxis[2] / axisLen];

        let refX: [number, number, number] = [1, 0, 0];
        if (Math.abs(axisNorm[0]) > 0.9 && Math.abs(axisNorm[1]) < 0.1 && Math.abs(axisNorm[2]) < 0.1) {
            refX = [0, 1, 0];
        }

        const dot = refX[0] * axisNorm[0] + refX[1] * axisNorm[1] + refX[2] * axisNorm[2];
        let pX: [number, number, number] = [
            refX[0] - dot * axisNorm[0],
            refX[1] - dot * axisNorm[1],
            refX[2] - dot * axisNorm[2]
        ];

        const lenPX = Math.sqrt(pX[0] ** 2 + pX[1] ** 2 + pX[2] ** 2);
        if (lenPX < 0.0001) {
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

        const planeOrigin: [number, number, number] = [
            cOrg[0] + radius * radialDir[0],
            cOrg[1] + radius * radialDir[1],
            cOrg[2] + radius * radialDir[2]
        ];

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
        <BaseFormPanel
            schema={tangentPlaneSchema}
            initialValues={values}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('tangentPlane')}
        />
    );
}
