import { useEffect, useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { useSketchOptions } from '../../hooks/useSketchOptions';
import { generateExtrudeCode } from '../../features/core/extrude.feature';
import { BaseFormPanel } from '../Forms/BaseFormPanel';
import type { FormSchema, FormValues } from '../Forms/FormSchema';

const extrudeSchema: FormSchema = {
    title: 'Extrude',
    fields: [
        {
            name: 'sketchName',
            type: 'sketch-selector',
            label: 'Profile',
            required: true,
            id: 'sketch-select'
        },
        {
            name: 'distance',
            type: 'number',
            label: 'Distance (mm)',
            defaultValue: 10,
            min: 0.1,
            step: 0.5,
            id: 'extrude-distance'
        },
        {
            name: 'direction',
            type: 'select',
            label: 'Direction',
            defaultValue: 'normal',
            options: [
                { value: 'normal', label: 'Normal' },
                { value: 'reversed', label: 'Reversed' }
            ]
        }
    ]
};

export function ExtrudePanel() {
    const { codeContext, setPreviewCode, selectedSketchName } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();
    const sketchOptions = useSketchOptions();

    // Auto-select last sketch or use selectedSketchName
    const defaultSketchName = selectedSketchName ||
        (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '');

    const handleConfirm = (values: FormValues) => {
        console.log('ExtrudePanel: Confirming with values:', values);
        const code = generateExtrudeCode(
            codeContext,
            values.sketchName as string,
            values.distance as number,
            values.direction === 'normal' ? 'default' : 'reversed'
        );
        insertCode(code);
        closePanel('extrude');
    };

    // Live preview handler
    const handleChange = (values: FormValues) => {
        if (!values.sketchName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateExtrudeCode(
            codeContext,
            values.sketchName as string,
            values.distance as number,
            values.direction === 'normal' ? 'default' : 'reversed'
        );
        setPreviewCode(previewCode);
    };

    // Clear preview on unmount
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    const initialValues = useMemo(() => ({
        sketchName: defaultSketchName,
        distance: 10,
        direction: 'normal'
    }), [defaultSketchName]);

    return (
        <BaseFormPanel
            schema={extrudeSchema}
            initialValues={initialValues}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('extrude')}
            onChange={handleChange}
            submitLabel="Apply"
        />
    );
}
