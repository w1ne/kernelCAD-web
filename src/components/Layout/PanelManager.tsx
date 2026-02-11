import { useUI } from '../../context/UIContext';
import { AnimatePresence } from 'framer-motion';
import { FloatingPanel } from '../Shared/FloatingPanel.tsx';
import { PANELS } from '../../config/panels';

export function PanelManager() {
    const { activePanels, closePanel } = useUI();

    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            <div className="relative w-full h-full pointer-events-none">
                <AnimatePresence>
                    {activePanels.map(id => {
                        const config = PANELS[id];
                        if (!config) {
                            console.warn(`Panel configuration not found for id: ${id}`);
                            return null;
                        }

                        const PanelComponent = config.component;

                        return (
                            <div key={id} className="pointer-events-auto">
                                <FloatingPanel
                                    id={config.id}
                                    title={config.title}
                                    onClose={() => closePanel(id)}
                                    initialPosition={config.initialPosition}
                                >
                                    <PanelComponent {...(config.props || {})} />
                                </FloatingPanel>
                            </div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
