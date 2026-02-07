import { useUI } from '../../context/UIContext';
import { AnimatePresence } from 'framer-motion';
import { FloatingPanel } from '../Shared/FloatingPanel.tsx';
import { ExtrudePanel } from '../Panels/ExtrudePanel';
import { RevolvePanel } from '../Panels/RevolvePanel';
import { FilletPanel } from '../Panels/FilletPanel';
import { ChamferPanel } from '../Panels/ChamferPanel';
import { BooleanPanel } from '../Panels/BooleanPanel';
import { PlaneSelectorPanel } from '../Panels/PlaneSelectorPanel';
import { OffsetPlanePanel } from '../Panels/OffsetPlanePanel';
import { SketchOnFacePanel } from '../Panels/SketchOnFacePanel';
import { ExtrudeFromFacePanel } from '../Panels/ExtrudeFromFacePanel';

export function PanelManager() {
    const { activePanels, closePanel } = useUI();

    const renderPanel = (id: string) => {
        switch (id) {
            case 'extrude':
                return (
                    <FloatingPanel
                        key="extrude"
                        id="extrude"
                        title="Extrude"
                        onClose={() => closePanel('extrude')}
                        initialPosition={{ x: window.innerWidth - 380, y: 80 }}
                    >
                        <ExtrudePanel />
                    </FloatingPanel>
                );
            case 'revolve':
                return (
                    <FloatingPanel
                        key="revolve"
                        id="revolve"
                        title="Revolve"
                        onClose={() => closePanel('revolve')}
                        initialPosition={{ x: window.innerWidth - 380, y: 120 }}
                    >
                        <RevolvePanel />
                    </FloatingPanel>
                );
            case 'fillet':
                return (
                    <FloatingPanel
                        key="fillet"
                        id="fillet"
                        title="Fillet"
                        onClose={() => closePanel('fillet')}
                        initialPosition={{ x: window.innerWidth - 380, y: 160 }}
                    >
                        <FilletPanel />
                    </FloatingPanel>
                );
            case 'chamfer':
                return (
                    <FloatingPanel
                        key="chamfer"
                        id="chamfer"
                        title="Chamfer"
                        onClose={() => closePanel('chamfer')}
                        initialPosition={{ x: window.innerWidth - 380, y: 200 }}
                    >
                        <ChamferPanel />
                    </FloatingPanel>
                );
            case 'union':
                return (
                    <FloatingPanel
                        key="union"
                        id="union"
                        title="Join (Union)"
                        onClose={() => closePanel('union')}
                        initialPosition={{ x: window.innerWidth - 380, y: 240 }}
                    >
                        <BooleanPanel type="fuse" />
                    </FloatingPanel>
                );
            case 'cut':
                return (
                    <FloatingPanel
                        key="cut"
                        id="cut"
                        title="Cut (Subtract)"
                        onClose={() => closePanel('cut')}
                        initialPosition={{ x: window.innerWidth - 380, y: 280 }}
                    >
                        <BooleanPanel type="cut" />
                    </FloatingPanel>
                );
            case 'intersect':
                return (
                    <FloatingPanel
                        key="intersect"
                        id="intersect"
                        title="Intersect"
                        onClose={() => closePanel('intersect')}
                        initialPosition={{ x: window.innerWidth - 380, y: 320 }}
                    >
                        <BooleanPanel type="intersect" />
                    </FloatingPanel>
                );
            case 'planeSelector':
                return (
                    <FloatingPanel
                        key="planeSelector"
                        id="planeSelector"
                        title="Select Sketch Plane"
                        onClose={() => closePanel('planeSelector')}
                        initialPosition={{ x: window.innerWidth / 2 - 160, y: 150 }}
                    >
                        <PlaneSelectorPanel />
                    </FloatingPanel>
                );
            case 'offsetPlane':
                return (
                    <FloatingPanel
                        key="offsetPlane"
                        id="offsetPlane"
                        title="Construction Plane"
                        onClose={() => closePanel('offsetPlane')}
                        initialPosition={{ x: window.innerWidth - 380, y: 360 }}
                    >
                        <OffsetPlanePanel />
                    </FloatingPanel>
                );
            case 'sketchOnFace':
                return (
                    <FloatingPanel
                        key="sketchOnFace"
                        id="sketchOnFace"
                        title="New Sketch"
                        onClose={() => closePanel('sketchOnFace')}
                        initialPosition={{ x: window.innerWidth - 380, y: 400 }}
                    >
                        <SketchOnFacePanel />
                    </FloatingPanel>
                );
            case 'extrudeFromFace':
                return (
                    <FloatingPanel
                        key="extrudeFromFace"
                        id="extrudeFromFace"
                        title="Extrude"
                        onClose={() => closePanel('extrudeFromFace')}
                        initialPosition={{ x: window.innerWidth - 380, y: 440 }}
                    >
                        <ExtrudeFromFacePanel />
                    </FloatingPanel>
                );
            // Add more panels here
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            <div className="relative w-full h-full pointer-events-none">
                <AnimatePresence>
                    {activePanels.map(id => (
                        <div key={id} className="pointer-events-auto">
                            {renderPanel(id)}
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
