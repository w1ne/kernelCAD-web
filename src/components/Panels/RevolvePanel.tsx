import { useEffect } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useUI } from '../../context/UIContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { useSketchOptions } from '../../hooks/useSketchOptions';
import { generateRevolveCode } from '../../features/core/revolve.feature';
import { BaseFormPanel } from '../Forms/BaseFormPanel';
import type { FormSchema, FormValues } from '../Forms/FormSchema';

const revolveSchema: FormSchema = {
    title: 'Revolve',
    fields: [
        {
            name: 'sketchName',
            type: 'sketch-selector',
            label: 'Profile',
            required: true
        },
        {
            name: 'angle',
            type: 'number',
            label: 'Angle (deg)',
            defaultValue: 360,
            min: 1,
            max: 360,
            step: 1
        },
        {
            name: 'axis',
            type: 'select',
            label: 'Rotation Axis',
            defaultValue: 'X',
            options: [
                { value: 'X', label: 'X' },
                { value: 'Y', label: 'Y' },
                { value: 'Z', label: 'Z' }
            ]
        }
    ]
};

export function RevolvePanel() {
    const { codeContext, setPreviewCode, selectedSketchName } = useWorkbench();
    const { closePanel } = useUI();
    const { insertCode } = useCodeInsertion();
    const sketchOptions = useSketchOptions();

    // Auto-select last sketch or use selectedSketchName
    const defaultSketchName = selectedSketchName ||
        (sketchOptions.length > 0 ? sketchOptions[sketchOptions.length - 1].value : '');

    const handleConfirm = (values: FormValues) => {
        const code = generateRevolveCode(
            codeContext,
            values.sketchName as string,
            values.angle as number,
            values.axis as string
        );
        insertCode(code);
        closePanel('revolve');
    };

    // Live preview handler
    const handleChange = (values: FormValues) => {
        if (!values.sketchName) {
            setPreviewCode(null);
            return;
        }

        const previewCode = generateRevolveCode(
            codeContext,
            values.sketchName as string,
            values.angle as number,
            values.axis as string
        );
        setPreviewCode(previewCode);
    };

    // Clear preview on unmount
    useEffect(() => {
        return () => setPreviewCode(null);
    }, [setPreviewCode]);

    return (
        <BaseFormPanel
            schema={revolveSchema}
            initialValues={{
                sketchName: defaultSketchName,
                angle: 360,
                axis: 'X'
            }}
            onConfirm={handleConfirm}
            onCancel={() => closePanel('revolve')}
            onChange={handleChange}
        />
    );
}
