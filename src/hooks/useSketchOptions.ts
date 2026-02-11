import { useMemo } from 'react';
import { useWorkbench } from '../context/WorkbenchContext';
import { getSketchVariablesAST } from '../lib/ast';

export interface SketchOption {
    key: string;
    value: string;
    label: string;
}

/**
 * Hook to get available sketch options from both UI-created sketches and code-based sketches
 */
export function useSketchOptions(): SketchOption[] {
    const { sketches, code } = useWorkbench();

    return useMemo(() => {
        const options: SketchOption[] = [];
        const seenNames = new Set<string>();

        // 1. UI-created sketches (have plane info)
        for (const s of sketches) {
            if (!s.name || seenNames.has(s.name)) continue;
            seenNames.add(s.name);
            options.push({
                key: `ui:${s.id}`,
                value: s.name,
                label: `${s.name} (${s.plane} Plane)`
            });
        }

        // 2. Code-based sketches (from AST)
        let codeSketches: string[] = [];
        try {
            codeSketches = getSketchVariablesAST(code);
        } catch {
            codeSketches = [];
        }

        for (const name of codeSketches) {
            if (!name || seenNames.has(name)) continue;
            seenNames.add(name);
            options.push({
                key: `code:${name}`,
                value: name,
                label: `${name} (From Code)`
            });
        }

        return options;
    }, [sketches, code]);
}
