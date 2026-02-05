import { createContext, useContext, useState, useMemo, type ReactNode, useRef, useCallback } from 'react';
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
    const constraintsRef = useRef<Constraint[]>([]);

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
                // We trust the caller to pass valid updates for the entity type.
                next.set(id, { ...entity, ...updates } as SketchEntity);
            }
            return next;
        });
    }, []);

    const solve = useCallback(() => {
        setEntities(prev => {
            const next = new Map(prev);

            // Re-copy objects to avoid mutation of old state
            for (const [key, val] of next.entries()) {
                next.set(key, { ...val });
            }

            const solverState: SolverState = { entities: next, constraints: constraintsRef.current };
            solverRef.current.solve(solverState);

            return next;
        });
    }, []);

    const addConstraint = useCallback((constraint: Constraint) => {
        setConstraints(prev => {
            const next = [...prev, constraint];
            constraintsRef.current = next;
            return next;
        });
        // Auto-solve when adding constraint (after state updates flush)
        queueMicrotask(solve);
    }, [solve]);

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

    const value: SketchingContextType = useMemo(() => ({
        entities,
        constraints,
        selectedEntityIds,
        addEntity,
        updateEntity,
        addConstraint,
        selectEntity,
        clearSelection,
        solve
    }), [entities, constraints, selectedEntityIds, addEntity, updateEntity, addConstraint, selectEntity, clearSelection, solve]);

    return <SketchingContext.Provider value={value}>{children}</SketchingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSketching() {
    const context = useContext(SketchingContext);
    if (!context) {
        throw new Error("useSketching must be used within a SketchingProvider");
    }
    return context;
}
