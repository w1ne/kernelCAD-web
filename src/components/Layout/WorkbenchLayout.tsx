import React, { useMemo } from 'react';
import CodeEditor from '../Editor';
import Viewer from '../Viewer';
import Toolbar from '../Toolbar';
import ParameterDialog from '../Dialogs/ParameterDialog';
import { ExtrudeDialog } from '../Dialogs/ExtrudeDialog';
import { RevolveDialog } from '../Dialogs/RevolveDialog';
import { FilletDialog } from '../Dialogs/FilletDialog';
import { ChamferDialog } from '../Dialogs/ChamferDialog';
import { PlaneSelectorDialog } from '../Dialogs/PlaneSelectorDialog';
import { OffsetPlaneDialog } from '../Dialogs/OffsetPlaneDialog';
import { SketchCanvas } from '../SketchCanvas';
import { Header } from './Header';
import { SidePanel } from './SidePanel';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { featureRegistry } from '../../features/FeatureRegistry';
import { type Feature } from '../../features/types';
import { type SketchData } from '../../types/sketch';
import { type SketchPlaneEntity } from '../../types/plane';
import { generateSketchCode, generateSketchName } from '../../lib/sketchCodegen';
import { generateRevolveCode } from '../../features/core/revolve.feature';
import { generateFilletCode, generateChamferCode, generateBooleanCode } from '../../features/core/modifiers.feature';
import { BooleanDialog } from '../Dialogs/BooleanDialog';
import { AlertCircle, Loader2 } from 'lucide-react';

export function WorkbenchLayout() {
    const {
        viewMode,
        viewMode3D,
        code,
        setCode,
        geometries,
        error,
        isReady,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance,
        sketchMode,
        setSketchMode,
        addSketch,
        planes,
        addPlane,
    } = useWorkbench();

    const { insertCode } = useCodeInsertion();

    // Get all features for the toolbar
    const features = useMemo(() => featureRegistry.getAll(), []);

    const activeFeature = useMemo(() => {
        return activeDialog ? featureRegistry.get(activeDialog) : null;
    }, [activeDialog]);

    // Refresh editor layout when switching modes
    React.useEffect(() => {
        if (viewMode === 'code' && editorInstance) {
            setTimeout(() => editorInstance.layout(), 350);
        }
    }, [viewMode, editorInstance]);

    const handleEditorDidMount = (editor: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setEditorInstance(editor);
    };

    const handleToolClick = (feature: Feature) => {
        if (feature.parameters && feature.parameters.length > 0) {
            setActiveDialog(feature.id);
        } else {
            feature.execute({ insertCode, setActiveDialog });
        }
    };

    const handleDialogSubmit = (values: Record<string, number>) => {
        if (activeFeature) {
            activeFeature.execute({ insertCode, setActiveDialog }, values);
        }
    };

    const handleJumpToLine = (line: number) => {
        if (editorInstance) {
            editorInstance.setPosition({ lineNumber: line, column: 1 });
            editorInstance.revealLineInCenter(line);
            editorInstance.focus();
        }
    };

    if (!isReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Initializing Kernel...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Pane */}
                <div className={`h-full flex flex-col border-r border-[#333] transition-all duration-300 ${viewMode === 'code' ? 'w-[40%]' : 'w-[250px]'}`}>
                    <div className="flex-1 relative overflow-hidden flex">
                        <Toolbar features={features} onToolClick={handleToolClick} />

                        <div className="flex-1 h-full relative flex flex-col">
                            {/* GUI Mode: Scene Browser */}
                            {viewMode === 'gui' && (
                                <SidePanel onJumpToLine={handleJumpToLine} />
                            )}

                            {/* Code Mode: Editor */}
                            <div className={`flex-1 h-full relative ${viewMode === 'gui' ? 'hidden' : ''}`}>
                                <CodeEditor
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    onMount={handleEditorDidMount}
                                />
                                {error && (
                                    <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700/50 shadow-xl backdrop-blur-md text-xs font-mono flex gap-2 items-start pointer-events-none">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <pre className="whitespace-pre-wrap">{error}</pre>
                                    </div>
                                )}
                            </div>

                            {/* Dialog Overlay */}
                            {activeFeature && activeFeature.parameters && (
                                <ParameterDialog
                                    key={activeFeature.id}
                                    isOpen={!!activeDialog}
                                    onClose={() => setActiveDialog(null)}
                                    onSubmit={handleDialogSubmit}
                                    title={activeFeature.label}
                                    fields={activeFeature.parameters.map(p => ({
                                        key: p.name,
                                        label: p.label,
                                        defaultValue: p.defaultValue,
                                        step: p.step
                                    }))}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Pane: 3D Viewport */}
                <div className="flex-1 h-full relative bg-[#0a0a0a]">
                    <Viewer geometries={geometries} viewMode3D={viewMode3D} />
                </div>
            </div>

            {/* Sketch Canvas Overlay */}
            {sketchMode.active && sketchMode.plane && (
                <SketchCanvas
                    plane={sketchMode.plane}
                    onComplete={(entities) => {
                        // Generate sketch name
                        const sketchName = generateSketchName(code);

                        // Create sketch data
                        const sketchData: SketchData = {
                            id: `sketch_${Date.now()}`,
                            name: sketchName,
                            plane: sketchMode.plane!,
                            entities,
                            closed: false,
                            createdAt: Date.now(),
                        };

                        // Generate Replicad code
                        const sketchCode = generateSketchCode(sketchData);

                        // Insert sketch code
                        insertCode(sketchCode);

                        // Track sketch history
                        addSketch(sketchData);

                        // Exit sketch mode
                        setSketchMode({
                            active: false,
                            plane: null,
                            currentSketch: null,
                            tool: 'select',
                        });
                    }}
                    onCancel={() => {
                        setSketchMode({
                            active: false,
                            plane: null,
                            currentSketch: null,
                            tool: 'select',
                        });
                    }}
                />
            )}

            {/* Plane Selector Dialog */}
            {activeDialog === 'planeSelector' && (
                <PlaneSelectorDialog
                    onSelect={(plane) => {
                        setSketchMode({
                            active: true,
                            plane: plane,
                            currentSketch: null,
                            tool: 'line',
                        });
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Extrude Dialog */}
            {activeDialog === 'extrude' && (
                <ExtrudeDialog
                    onConfirm={({ sketchName, distance, direction }) => {
                        // Generate extrude code
                        const extrudeCode = direction === 'reversed'
                            ? `\nconst extruded${sketchName.replace('sketch', '')} = ${sketchName}.extrude(-${distance});`
                            : `\nconst extruded${sketchName.replace('sketch', '')} = ${sketchName}.extrude(${distance});`;

                        // Insert extrude code
                        insertCode(extrudeCode);

                        // Close dialog
                        setActiveDialog(null);
                    }}
                    onCancel={() => {
                        setActiveDialog(null);
                    }}
                />
            )}

            {/* Revolve Dialog */}
            {activeDialog === 'revolve' && (
                <RevolveDialog
                    onConfirm={({ sketchName, angle, axis }) => {
                        // Generate revolve code
                        const revolveCode = generateRevolveCode(sketchName, angle, axis);

                        // Insert revolve code
                        insertCode(revolveCode);

                        // Close dialog
                        setActiveDialog(null);
                    }}
                    onCancel={() => {
                        setActiveDialog(null);
                    }}
                />
            )}

            {/* Fillet Dialog */}
            {activeDialog === 'fillet' && (
                <FilletDialog
                    onConfirm={({ targetName, radius, filterType }) => {
                        const code = generateFilletCode(targetName, radius, filterType);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Chamfer Dialog */}
            {activeDialog === 'chamfer' && (
                <ChamferDialog
                    onConfirm={({ targetName, distance, filterType }) => {
                        const code = generateChamferCode(targetName, distance, filterType);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Boolean Operations Dialogs */}
            {['union', 'cut', 'intersect'].includes(activeDialog || '') && (
                <BooleanDialog
                    type={activeDialog === 'union' ? 'fuse' : (activeDialog as any)}
                    onConfirm={({ baseName, toolName, type }) => {
                        const code = generateBooleanCode(baseName, toolName, type);
                        insertCode(code);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

            {/* Offset Plane Dialog */}
            {activeDialog === 'offsetPlane' && (
                <OffsetPlaneDialog
                    onConfirm={({ basePlaneId, offset }) => {
                        const basePlane = planes.find(p => p.id === basePlaneId);
                        if (!basePlane) return;

                        const newId = `plane-${Date.now()}`;
                        const newName = `Offset Plane ${planes.length - 2}`; // -3 base planes + 1

                        const newPlane: SketchPlaneEntity = {
                            id: newId,
                            name: newName,
                            type: 'offset',
                            origin: [
                                basePlane.origin[0] + basePlane.normal[0] * offset,
                                basePlane.origin[1] + basePlane.normal[1] * offset,
                                basePlane.origin[2] + basePlane.normal[2] * offset,
                            ],
                            normal: [...basePlane.normal] as [number, number, number],
                            visible: true,
                            parentId: basePlaneId
                        };

                        addPlane(newPlane);
                        setActiveDialog(null);
                    }}
                    onCancel={() => setActiveDialog(null)}
                />
            )}

        </div>
    );
}
