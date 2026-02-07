// ============================================================================
// State Definitions
// ============================================================================

export type WorkbenchMode =
    | { type: 'IDLE' }
    | { type: 'SKETCHING'; planeId: string; sketchId?: string }
    | { type: 'DIALOG'; id: string; params?: unknown }
    | { type: 'FACE_SELECTION'; purpose: 'sketch' | 'feature'; featureId?: string };

export interface WorkbenchState {
    mode: WorkbenchMode;
    activePanels: string[]; // List of IDs for floating panels
    // We can piggyback transient UI state here if needed, but keeping it minimal is safer
}

export const INITIAL_STATE: WorkbenchState = {
    mode: { type: 'IDLE' },
    activePanels: []
};

// ============================================================================
// Actions
// ============================================================================

export type WorkbenchAction =
    | { type: 'START_SKETCH'; planeId: string; sketchId?: string }
    | { type: 'EXIT_SKETCH' }
    | { type: 'OPEN_DIALOG'; id: string; params?: unknown }
    | { type: 'CLOSE_DIALOG' }
    | { type: 'START_FACE_SELECTION'; purpose: 'sketch' | 'feature'; featureId?: string }
    | { type: 'CANCEL_SELECTION' }
    | { type: 'GO_IDLE' }
    | { type: 'OPEN_PANEL'; id: string }
    | { type: 'CLOSE_PANEL'; id: string };

// ============================================================================
// Reducer
// ============================================================================

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
    switch (action.type) {
        case 'START_SKETCH':
            return {
                ...state,
                mode: {
                    type: 'SKETCHING',
                    planeId: action.planeId,
                    sketchId: action.sketchId
                }
            };

        case 'EXIT_SKETCH':
            if (state.mode.type !== 'SKETCHING') return state; // Guard
            return { ...state, mode: { type: 'IDLE' } };

        case 'OPEN_DIALOG':
            // If we are sketching, we might want to prevent dialogs or verify compatibility
            // For now, simple replacement:
            return {
                ...state,
                mode: { type: 'DIALOG', id: action.id, params: action.params }
            };

        case 'CLOSE_DIALOG':
            if (state.mode.type !== 'DIALOG') return state;
            return { ...state, mode: { type: 'IDLE' } };

        case 'START_FACE_SELECTION':
            return {
                ...state,
                mode: {
                    type: 'FACE_SELECTION',
                    purpose: action.purpose,
                    featureId: action.featureId
                }
            };

        case 'CANCEL_SELECTION':
            if (state.mode.type !== 'FACE_SELECTION') return state;
            return { ...state, mode: { type: 'IDLE' } };

        case 'GO_IDLE':
            return { ...state, mode: { type: 'IDLE' } };

        case 'OPEN_PANEL':
            if (state.activePanels.includes(action.id)) return state;
            return {
                ...state,
                activePanels: [...state.activePanels, action.id]
            };

        case 'CLOSE_PANEL':
            return {
                ...state,
                activePanels: state.activePanels.filter(id => id !== action.id)
            };

        default:
            return state;
    }
}
