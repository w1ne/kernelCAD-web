import { createContext, useContext, useState, type ReactNode, useRef, useCallback } from 'react';
import type { Constraint, SketchEntity, SolverState } from '../lib/constraints/types';
import { ConstraintSolver } from '../lib/constraints/solver';

export interface SketchingContextType {
    entities: Map<string, SketchEntity>;
    constraints: Constraint[];
    selectedEntityIds: string[];
    addEntity: (entity: SketchEntity) => void;
    updateEntity: (id: string, updates: Partial<SketchEntity>) => void;
    addConstraint: (constraint: Constraint) => void;
    selectEntity: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    solve: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SketchingContext = createContext<SketchingContextType | undefined>(undefined);

export function SketchingProvider({ children }: { children: ReactNode }) {
    const [entities, setEntities] = useState<Map<string, SketchEntity>>(new Map());
    const [constraints, setConstraints] = useState<Constraint[]>([]);
    const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
    const solverRef = useRef(new ConstraintSolver());

    const addEntity = useCallback((entity: SketchEntity) => {
        setEntities(prev => {
            const next = new Map(prev);
            next.set(entity.id, entity);
            return next;
        });
    }, []);

    const updateEntity = useCallback((id: string, updates: Partial<SketchEntity>) => {
        setEntities(prev => {
            const next = new Map(prev);
            const entity = next.get(id);
            if (entity) {
                // Safe update by casting to any or discriminating
                // Since updates is partial, we trust the caller passing valid updates for the entity type
                // Typically one would check: if (entity.type === 'POINT') ...
                next.set(id, { ...entity, ...updates } as SketchEntity);
            }
            return next;
        });
    }, []);

    const addConstraint = useCallback((constraint: Constraint) => {
        setConstraints(prev => [...prev, constraint]);
        // Auto-solve when adding constraint
        setTimeout(solve, 0);
    }, []);

    const selectEntity = useCallback((id: string, multi = false) => {
        setSelectedEntityIds(prev => {
            if (multi) {
                return prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id];
            }
            return [id];
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedEntityIds([]);
    }, []);

    const solve = useCallback(() => {
        setEntities(prev => {
            const next = new Map(prev);
            // Create a temporary solver state
            // We use 'constraints' from the state, but we need to access the LATEST constraints.
            // Since this runs in setEntities updater, 'constraints' variable is captured from closure 'solve' creation.
            // We should use a ref for constraints if we want latest inside this callback without re-creating 'solve'.
            // For now, depending on 'constraints' in dependency array is fine.

            // Re-copy objects to avoid mutation of old state
            for (const [key, val] of next.entries()) {
                next.set(key, { ...val });
            }

            const solverState: SolverState = { entities: next, constraints };
            solverRef.current.solve(solverState);

            return next;
        });
    }, [constraints]);

    const value: SketchingContextType = {
        entities,
        constraints,
        selectedEntityIds,
        addEntity,
        updateEntity,
        addConstraint,
        selectEntity,
        clearSelection,
        solve
    };

    return <SketchingContext.Provider value={value}>{children}</SketchingContext.Provider>;
}

export function useSketching() {
    const context = useContext(SketchingContext);
    if (!context) {
        throw new Error("useSketching must be used within a SketchingProvider");
    }
    return context;
}
