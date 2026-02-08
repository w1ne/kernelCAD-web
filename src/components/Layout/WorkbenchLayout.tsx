import React, { useMemo } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import ParameterDialog from '../Dialogs/ParameterDialog';
import { SketchCanvas } from '../SketchCanvas';
import { Header } from './Header';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { useCommandRegistry } from '../../hooks/useCommandRegistry';
import { Box, Circle, Layers, Scissors, Square, Triangle } from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { featureRegistry } from '../../features/FeatureRegistry';
import { type Feature, type DialogField } from '../../features/types';
import { type SketchData, type SketchPlane } from '../../types/sketch';
import type { SketchPlaneEntity } from '../../types/plane';
import { generateSketchCode, generateSketchBody } from '../../lib/sketchCodegen';
import { Loader2 } from 'lucide-react';

// Modular Panels
import { EditorPanel } from './EditorPanel';
import { ViewerPanel } from './ViewerPanel';
import { NavigationPanel } from './NavigationPanel';
import { PanelManager } from './PanelManager';
import { ContextToolbar } from './ContextToolbar';
import { useUI } from '../../context/UIContext';

export function WorkbenchLayout() {
    const {
        viewMode,
        viewMode3D,
        code,
        setCode,
        commandManager,
        geometries,
        sketchesGeometries,
        showSketches,
        error,
        isReady,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance,
        sketchMode,
        setSketchMode,
        addSketch,
        selectedFace,
        isFaceSelecting,
        cancelFaceSelection,
        codeContext,
        previewGeometries,
        hideItem,
        showAll,
        selectedItemId,
        toggleVisibility,
        openPanel,
        closePanel,
        selectedSketchName,
        toggleSketchVisibility,
        activePanels
    } = useWorkbench();

    const { contextMenu, setContextMenu } = useUI();

    // Expose helpers for E2E testing
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            window.setCode = setCode;
            window.getCode = () => code;
            window.isEditorReady = !!editorInstance;
            window.setActiveDialog = setActiveDialog;
        }
    }, [setCode, code, editorInstance, setActiveDialog]);

    const { insertCode } = useCodeInsertion();

    const features = useMemo(() => featureRegistry.getAll(), []);
    const activeFeature = useMemo(() => activeDialog ? featureRegistry.get(activeDialog) : null, [activeDialog]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        'e': () => {
            if (activeDialog) return;
            openPanel('extrude');
        },
        'r': () => {
            if (activeDialog) return;
            openPanel('revolve');
        },
        'f': () => {
            if (activeDialog) return;
            openPanel('fillet');
        },
        'c': () => {
            if (activeDialog) return;
            openPanel('chamfer');
        },
        'j': () => {
            if (activeDialog) return;
            openPanel('union');
        },
        'x': () => {
            if (activeDialog) return;
            openPanel('cut');
        },
        'i': () => {
            if (activeDialog) return;
            openPanel('intersect');
        },
        'mod+z': () => {
            if (activeDialog) return;
            commandManager.undo();
        },
        'mod+shift+z': () => {
            if (activeDialog) return;
            commandManager.redo();
        },
        'mod+y': () => {
            if (activeDialog) return;
            commandManager.redo();
        },
        's': () => {
            if (activeDialog || sketchMode.active) return;
            openPanel('planeSelector');
        },
        'p': () => {
            if (activeDialog) return;
            openPanel('offsetPlane');
        },
        'escape': () => {
            if (activeDialog) setActiveDialog(null);
            if (isFaceSelecting) cancelFaceSelection();
            setContextMenu({ ...contextMenu, visible: false });
            // Close all active panels on Escape
            activePanels.forEach(id => closePanel(id));
        },
        'h': () => {
            if (activeDialog) return;
            if (selectedItemId) hideItem(selectedItemId);
        },
        'shift+h': () => {
            if (activeDialog) return;
            showAll();
        },
        'space': () => {
            if (activeDialog) return;
            if (selectedItemId) toggleVisibility(selectedItemId);
        },
        'backspace': () => {
            if (activeDialog) return;
            if (selectedItemId) {
                console.log('Delete item:', selectedItemId);
                // Implementation pending for real delete logic
            }
        },
        'delete': () => {
            if (activeDialog) return;
            if (selectedItemId) {
                console.log('Delete item:', selectedItemId);
                // Implementation pending for real delete logic
            }
        },
        'alt+s': () => {
            toggleSketchVisibility();
        }
    });


    // Register Commands for Palette
    const { registerCommand } = useCommandRegistry();

    // Use a ref to store the latest values needed by command actions
    const actionContextRef = React.useRef({
        selectedFace,
        insertCode,
        setCode,
        setActiveDialog,
        code,
        codeContext
    });

    // Update the ref on every render
    React.useEffect(() => {
        actionContextRef.current = {
            selectedFace,
            insertCode,
            setCode,
            setActiveDialog,
            code,
            codeContext
        };
    });

    React.useEffect(() => {
        const unregisters: (() => void)[] = [];

        // Modeling Commands
        unregisters.push(registerCommand({
            id: 'extrude',
            label: 'Extrude',
            section: 'Modeling',
            shortcut: 'E',
            icon: <Box className="w-4 h-4" />,
            action: () => {
                openPanel('extrude');
            }
        }));

        unregisters.push(registerCommand({
            id: 'revolve',
            label: 'Revolve',
            section: 'Modeling',
            shortcut: 'R',
            icon: <Circle className="w-4 h-4" />,
            action: () => {
                openPanel('revolve');
            }
        }));

        unregisters.push(registerCommand({
            id: 'fillet',
            label: 'Fillet',
            section: 'Modeling',
            shortcut: 'F',
            icon: <Circle className="w-4 h-4" />,
            action: () => {
                openPanel('fillet');
            }
        }));

        unregisters.push(registerCommand({
            id: 'chamfer',
            label: 'Chamfer',
            section: 'Modeling',
            shortcut: 'C',
            icon: <Triangle className="w-4 h-4" />,
            action: () => {
                openPanel('chamfer');
            }
        }));

        unregisters.push(registerCommand({
            id: 'boolean-union',
            label: 'Boolean Union',
            section: 'Modeling',
            shortcut: 'J',
            icon: <Layers className="w-4 h-4" />,
            action: () => {
                openPanel('union');
            }
        }));

        unregisters.push(registerCommand({
            id: 'boolean-cut',
            label: 'Boolean Cut',
            section: 'Modeling',
            shortcut: 'X',
            icon: <Scissors className="w-4 h-4" />,
            action: () => {
                openPanel('cut');
            }
        }));

        unregisters.push(registerCommand({
            id: 'toggle-sketches',
            label: 'Toggle Sketches',
            section: 'View',
            shortcut: 'Alt+S',
            icon: <Layers className="w-4 h-4" />,
            action: () => {
                toggleSketchVisibility();
            }
        }));

        // Contextual Commands
        unregisters.push(registerCommand({
            id: 'sketch-plane-selector',
            label: 'New Sketch (Select Plane)',
            section: 'General',
            shortcut: 'S',
            icon: <Square className="w-4 h-4" />,
            action: () => {
                openPanel('planeSelector');
            }
        }));

        unregisters.push(registerCommand({
            id: 'offset-plane',
            label: 'Construction Plane',
            section: 'Modeling',
            shortcut: 'P',
            icon: <Layers className="w-4 h-4" />,
            action: () => {
                openPanel('offsetPlane');
            }
        }));

        return () => unregisters.forEach(u => u());
    }, [registerCommand, toggleSketchVisibility, openPanel]); // Only stable dependencies

    const handleToolClick = (feature: Feature) => {
        if (feature.id === 'extrudeFromFace') {
            openPanel('extrudeFromFace');
        } else if (feature.id === 'sketchOnFace') {
            openPanel('sketchOnFace');
        } else {
            // Original logic for other features
            if (['extrude', 'revolve', 'fillet', 'chamfer', 'union', 'cut', 'intersect', 'offsetPlane', 'planeSelector'].includes(feature.id)) {
                openPanel(feature.id);
                return;
            }

            if (feature.parameters && feature.parameters.length > 0) {
                setActiveDialog(feature.id);
            } else {
                feature.execute({
                    insertCode,
                    setCode,
                    setActiveDialog,
                    openPanel,
                    closePanel,
                    code,
                    codeContext
                });
            }
        }
    };

    const handleContextAction = (actionId: string) => {
        setContextMenu({ ...contextMenu, visible: false });
        if (actionId === 'sketchOnFace') {
            openPanel('sketchOnFace');
        } else if (actionId === 'extrude') {
            // Check if we have a selected sketch or face
            if (selectedSketchName) {
                openPanel('extrude');
            } else if (selectedFace) {
                openPanel('extrudeFromFace');
            }
        } else {
            openPanel(actionId);
        }
    };

    const handleDialogSubmit = (values: Record<string, number>) => {
        if (activeFeature) {
            activeFeature.execute({
                insertCode,
                setCode,
                setActiveDialog,
                openPanel,
                closePanel,
                code,
                codeContext
            }, values);
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
        <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden flex-col" data-testid="workbench-ready">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                <NavigationPanel
                    viewMode={viewMode}
                    features={features}
                    onToolClick={handleToolClick}
                    onJumpToLine={handleJumpToLine}
                >
                    <EditorPanel
                        code={code}
                        onChange={(v) => setCode(v)}
                        onMount={(inst) => setEditorInstance(inst)}
                        error={error}
                        visible={viewMode !== 'gui'}
                    />
                </NavigationPanel>

                <ViewerPanel
                    geometries={geometries}
                    previewGeometries={previewGeometries}
                    sketchesGeometries={sketchesGeometries}
                    showSketches={showSketches}
                    viewMode3D={viewMode3D}
                    isFaceSelecting={isFaceSelecting}
                    onCancelFaceSelection={cancelFaceSelection}
                />
            </div>

            {/* Sketch Canvas Overlay */}
            {sketchMode.active && sketchMode.plane && (
                <SketchCanvas
                    plane={sketchMode.plane}
                    onComplete={(entities) => {
                        // CRITICAL: Validate entities before proceeding
                        if (!entities || entities.length === 0) {
                            console.error('Cannot create sketch: No geometry drawn');
                            alert('Please draw some geometry before completing the sketch.');
                            return;
                        }

                        // Use the name from the active sketch session if available
                        const sketchName = sketchMode.currentSketch?.name || codeContext.generateUniqueName('sketch');

                        // Parse plane name correctly
                        let planeName: SketchPlane = 'XY';
                        if (typeof sketchMode.plane === 'string') {
                            planeName = sketchMode.plane;
                        } else if (sketchMode.plane && typeof sketchMode.plane === 'object') {
                            planeName = sketchMode.plane.name;
                        }

                        const sketchData: SketchData = {
                            id: sketchMode.currentSketch?.id || `sketch_${Date.now()}`,
                            name: sketchName,
                            plane: planeName,
                            entities,
                            closed: false,
                            createdAt: sketchMode.currentSketch?.createdAt || Date.now(),
                        };

                        const planeEntity: SketchPlaneEntity | null =
                            sketchMode.plane && typeof sketchMode.plane === 'object' ? sketchMode.plane : null;
                        let sketchCode = '';

                        // Case 1: Parametric Sketch on Face
                        if (planeEntity && planeEntity.type === 'face' && planeEntity.faceId !== undefined && planeEntity.parentId && planeEntity.parentId !== 'unknown' && planeEntity.parentId !== 'shape') {
                            const startCode = `const ${sketchName} = sketchOnFace(${planeEntity.parentId}, ${planeEntity.faceId})\n`;
                            const bodyCode = generateSketchBody(entities);
                            sketchCode = startCode + bodyCode + ';\n';
                        }
                        // Case 2: Detached Sketch on a specific Plane object/origin
                        else if (planeEntity && planeEntity.type === 'face' && planeEntity.origin && planeEntity.normal) {
                            const xDir = planeEntity.xDir;
                            const xDirStr = xDir ? JSON.stringify(xDir) : 'null';
                            const planeCode = `new replicad.Plane(${JSON.stringify(planeEntity.origin)}, ${xDirStr}, ${JSON.stringify(planeEntity.normal)})`;
                            const startCode = `const ${sketchName} = new Sketcher(${planeCode})\n`;
                            const bodyCode = generateSketchBody(entities);
                            sketchCode = startCode + bodyCode + ';\n';
                        }
                        // Case 3: Standard Plane Sketch
                        else {
                            sketchCode = generateSketchCode(sketchData);
                        }

                        insertCode(sketchCode);
                        addSketch(sketchData);
                        setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                    }}
                    onCancel={() => {
                        setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                    }}
                />
            )}

            {/* Dialog Overlay */}
            {activeFeature && activeFeature.parameters && !['extrude', 'extrudeFromFace', 'sketchOnFace', 'revolve', 'fillet', 'chamfer', 'union', 'cut', 'intersect', 'offsetPlane', 'planeSelector'].includes(activeDialog || '') && (
                <ParameterDialog
                    key={activeFeature.id}
                    isOpen={!!activeDialog}
                    onClose={() => setActiveDialog(null)}
                    onSubmit={handleDialogSubmit}
                    title={activeFeature.label}
                    fields={activeFeature.parameters.map((p: DialogField) => ({
                        key: p.name,
                        label: p.label,
                        defaultValue: p.defaultValue,
                        step: p.step
                    }))}
                />
            )}
            {/* Command Palette Overlay */}
            <CommandPalette />

            {/* Contextual Toolbar Overlay */}
            <ContextToolbar
                visible={contextMenu.visible}
                position={contextMenu.position}
                type={contextMenu.type}
                onAction={handleContextAction}
            />

            {/* Multi-Panel Layer */}
            <PanelManager />
        </div>
    );
}
