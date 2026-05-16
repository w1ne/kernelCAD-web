import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { type WorkbenchState, type WorkbenchAction, workbenchReducer, INITIAL_STATE } from './workbenchState';

interface WorkbenchStateContextType {
    state: WorkbenchState;
    dispatch: React.Dispatch<WorkbenchAction>;
}

const WorkbenchStateContext = createContext<WorkbenchStateContextType | undefined>(undefined);

export function WorkbenchStateProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(workbenchReducer, INITIAL_STATE);

    return (
        <WorkbenchStateContext.Provider value={{ state, dispatch }}>
            {children}
        </WorkbenchStateContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkbenchState() {
    const context = useContext(WorkbenchStateContext);
    if (!context) {
        throw new Error("useWorkbenchState must be used within a WorkbenchStateProvider");
    }
    return context;
}
