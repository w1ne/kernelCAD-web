import { useState, useEffect, useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { createPlaneConstructorCode } from '../../lib/planeUtils';
import { BaseFormPanel, type FormValues, type FormSchema } from '../Forms';

interface Reference {
    id: string;
    name: string;
    data: {
        origin: [number, number, number];
        normal: [number, number, number];
    };
}

const midplaneSchema: FormSchema = {
    title: 'Midplane',
    description: 'Select two faces to create a plane between them.',
    fields: [
        {
            name: 'ref1',
            label: 'First Reference',
            type: 'selection-slot',
            placeholder: 'Click a face in viewer...',
            required: true
        },
        {
            name: 'ref2',
            label: 'Second Reference',
            type: 'selection-slot',
            placeholder: 'Click a face in viewer...',
            required: true
        }
    ]
};

export function MidplanePanel() {
    const {
        selectedFace,
        geometries,
        codeContext,
        insertCode,
        addPlane
    } = useWorkbench();
    const { closePanel } = useUI();

    const [activeField, setActiveField] = useState<'ref1' | 'ref2'>('ref1');
    const [values, setValues] = useState<FormValues>({
        ref1: null,
        ref2: null
    });

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
            setValues(prev => {
                const nextValues = { ...prev };
                nextValues[activeField] = item;
                return nextValues;
            });
            /* eslint-enable react-hooks/set-state-in-effect */

            if (activeField === 'ref1') {
                setActiveField('ref2');
            }
        }
    }, [selectedFace, geometries, activeField, codeContext]);

    const handleConfirm = (formValues: FormValues) => {
        const ref1 = formValues.ref1 as Reference;
        const ref2 = formValues.ref2 as Reference;

        if (!ref1 || !ref2) return;

        const o1 = ref1.data.origin;
        const n1 = ref1.data.normal;
        const o2 = ref2.data.origin;
        const n2 = ref2.data.normal;

        const origin: [number, number, number] = [
            (o1[0] + o2[0]) / 2,
            (o1[1] + o2[1]) / 2,
            (o1[2] + o2[2]) / 2
        ];

        let finalNormal: [number, number, number] = [...n1];
        const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];

        if (Math.abs(dot) > 0.99) {
            finalNormal = [...n1];
        } else {
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

    const initialValues = useMemo(() => values, [values]);

    return (
        <BaseFormPanel
            schema={midplaneSchema}
            initialValues={initialValues}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('midplane')}
            activeField={activeField}
            onFieldActivate={(name) => setActiveField(name as 'ref1' | 'ref2')}
            submitLabel="Create"
        />
    );
}
