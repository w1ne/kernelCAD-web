import React, { useMemo } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import ParameterDialog from '../Dialogs/ParameterDialog';
import { SketchCanvas } from '../SketchCanvas';
import { Header } from './Header';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { useCommandRegistry } from '../../hooks/useCommandRegistry';
import { Layers, Square } from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { useCodeInsertion } from '../../hooks/useCodeInsertion';
import { featureRegistry } from '../../features/FeatureRegistry';
import { type Feature, type DialogField } from '../../features/types';
import { type SketchData, type SketchPlane } from '../../types/sketch';
import type { SketchPlaneEntity } from '../../types/plane';
import { generateSketchCode, generateSketchBody } from '../../lib/sketchCodegen';
import { Loader2 } from 'lucide-react';
import { extractVariables } from '../../lib/codeAnalysis';

// Modular Panels
import { EditorPanel } from './EditorPanel';
import { ViewerPanel } from './ViewerPanel';
import { NavigationPanel } from './NavigationPanel';
import { PanelManager } from './PanelManager';
import { FloatingAgent } from '../../features/ai/FloatingAgent';
import { SmartWidget } from '../../features/ai/SmartWidget';
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
        deleteItem,
        toggleVisibility,
        openPanel,
        closePanel,
        selectedSketchName,
        setSelectedSketchName,
        toggleSketchVisibility,
        activePanels,
        setViewMode,
        setSidePanelVisible,
        clearAll,
        isComputing,
        executionCount,
        setSelectedFace,
        startFaceSelection
    } = useWorkbench();

    const { contextMenu, setContextMenu } = useUI();

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;

            // Core Editor Helpers
            w.setCode = setCode;
            w.getCode = () => code;
            w.isEditorReady = !!editorInstance;
            w.setActiveDialog = setActiveDialog;
            w.setViewMode = setViewMode;

            // Geometry & Selection Helpers
            w.__TEST_SELECT_FACE = (shapeIndex: number, faceId: number) => {
                setSelectedFace({ shapeIndex, faceId });
            };

            w.getSelectedFace = () => selectedFace;
            w.getGeometries = () => geometries;
            w.getPreviewGeometries = () => previewGeometries;
            w.getSketches = () => sketchesGeometries;
            w.isComputing = () => isComputing;
            w.getExecutionCount = () => executionCount;
            w.getError = () => error;

            // Face selection
            w.startFaceSelection = () => {
                startFaceSelection();
            };

            w.__TEST_SELECT_SKETCH = (name: string | null) => {
                setSelectedSketchName(name);
            };

            w.setActiveDialog = setActiveDialog;
        }
    }, [setCode, code, editorInstance, setActiveDialog, setViewMode, geometries, previewGeometries, sketchesGeometries, isComputing, executionCount, error, setSelectedFace, selectedFace, startFaceSelection, setSelectedSketchName]);

    // Recovery guard: never keep the editor hidden while code/execution is in error.
    React.useEffect(() => {
        if (!error) return;
        if (viewMode === 'gui') {
            setViewMode('code');
        }
        setSidePanelVisible(true);
    }, [error, viewMode, setViewMode, setSidePanelVisible]);

    const { insertCode } = useCodeInsertion();

    const features = useMemo(() => featureRegistry.getAll(), []);

    const activeFeature = useMemo(() => activeDialog ? featureRegistry.get(activeDialog) : null, [activeDialog]);
    const variableIndex = useMemo(() => {
        const map = new Map<string, number>();
        extractVariables(code).forEach((v) => map.set(v.name, v.line));
        return map;
    }, [code]);

    const featureShortcuts = useMemo(() => {
        const shortcuts: Record<string, () => void> = {};
        features.forEach(f => {
            if (f.shortcut) {
                shortcuts[f.shortcut] = () => {
                    if (activeDialog) return;
                    f.execute({
                        insertCode,
                        setCode,
                        code,
                        setActiveDialog,
                        openPanel,
                        closePanel,
                        codeContext
                    }, undefined);
                };
            }
        });
        return shortcuts;
    }, [features, activeDialog, insertCode, setCode, code, setActiveDialog, openPanel, closePanel, codeContext]);

    const handleToolClick = React.useCallback((feature: Feature) => {
        if (activeDialog) return;

        if (feature.id === 'extrudeFromFace') {
            openPanel('extrudeFromFace');
        } else if (feature.id === 'sketchOnFace') {
            openPanel('sketchOnFace');
        } else {
            // Original logic for other features
            if (['extrude', 'revolve', 'fillet', 'chamfer', 'union', 'cut', 'intersect', 'offsetPlane', 'midplane', 'tangentPlane'].includes(feature.id)) {
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
                }, undefined);
            }
        }
    }, [openPanel, setActiveDialog, insertCode, setCode, closePanel, code, codeContext, activeDialog]);

    // Use a ref for handleToolClick to avoid re-registering commands when it changes due to code updates
    const handleToolClickRef = React.useRef(handleToolClick);
    React.useEffect(() => {
        handleToolClickRef.current = handleToolClick;
    }, [handleToolClick]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        ...featureShortcuts,
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
        'backspace': (e) => {
            if (activeDialog) return;
            if (selectedItemId) {
                e.preventDefault();
                deleteItem(selectedItemId, variableIndex.get(selectedItemId));
            }
        },
        'delete': (e) => {
            if (activeDialog) return;
            if (selectedItemId) {
                e.preventDefault();
                deleteItem(selectedItemId, variableIndex.get(selectedItemId));
            }
        },
        'alt+s': () => {
            toggleSketchVisibility();
        },
        'mod+1': () => {
            setViewMode('code');
            setSidePanelVisible(true);
        },
        'mod+2': () => {
            setViewMode('gui');
        }
    });


    // Register Commands for Palette
    const { registerCommand } = useCommandRegistry();





    React.useEffect(() => {
        const unregisters: (() => void)[] = [];

        // Register feature commands
        features.forEach(f => {
            unregisters.push(registerCommand({
                id: f.id,
                label: f.label,
                icon: f.icon ? <f.icon className="w-4 h-4" /> : undefined,
                shortcut: f.shortcut,
                section: 'Modeling',
                action: () => handleToolClickRef.current(f)
            }));
        });

        // Register utility commands
        unregisters.push(registerCommand({
            id: 'toggleSketchVisibility',
            label: 'Toggle Sketches',
            shortcut: 'Alt+S', // Example
            section: 'View',
            icon: <Layers className="w-4 h-4" />,
            action: toggleSketchVisibility
        }));

        unregisters.push(registerCommand({
            id: 'planeSelector',
            label: 'Select Plane',
            section: 'Navigation',
            shortcut: 'S',
            icon: <Square className="w-4 h-4" />,
            action: () => {
                openPanel('planeSelector');
            }
        }));

        return () => unregisters.forEach(u => u());
    }, [registerCommand, toggleSketchVisibility, openPanel, features]); // Removed handleToolClick to prevent loop



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

            <div className="flex-1 flex overflow-hidden relative">
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

                {/* AI Agents Layer */}
                <FloatingAgent />
                <SmartWidget />
            </div>

            {/* Sketch Canvas Overlay */}
            {sketchMode.active && sketchMode.plane && (
                <SketchCanvas
                    plane={sketchMode.plane}
                    onComplete={(entities) => {
                        try {
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

                            // Case 1: Detached sketch on captured face plane.
                            // Prefer stable plane data over faceId because topology reindexing can move face indices.
                            if (planeEntity && planeEntity.type === 'face' && planeEntity.origin && planeEntity.normal) {
                                const xDir = planeEntity.xDir;
                                const xDirStr = xDir ? JSON.stringify(xDir) : 'null';
                                const planeCode = `new replicad.Plane(${JSON.stringify(planeEntity.origin)}, ${xDirStr}, ${JSON.stringify(planeEntity.normal)})`;
                                const startCode = `const ${sketchName} = new Sketcher(${planeCode})\n`;
                                const bodyCode = generateSketchBody(entities);
                                sketchCode = startCode + bodyCode + ';\n';
                            }
                            // Case 2: Parametric sketch on face index (fallback when no plane data is available)
                            else if (planeEntity && planeEntity.type === 'face' && planeEntity.faceId !== undefined && planeEntity.parentId && planeEntity.parentId !== 'unknown' && planeEntity.parentId !== 'shape') {
                                const startCode = `const ${sketchName} = sketchOnFace(${planeEntity.parentId}, ${planeEntity.faceId})\n`;
                                const bodyCode = generateSketchBody(entities);
                                sketchCode = startCode + bodyCode + ';\n';
                            }
                            // Case 3: Standard base plane sketch
                            else {
                                sketchCode = generateSketchCode(sketchData);
                            }

                            insertCode(sketchCode);
                            addSketch(sketchData);
                            clearAll();
                            setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                        } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            console.error('Failed to complete sketch:', err);
                            alert(`Failed to complete sketch: ${message}`);
                        }
                    }}
                    onCancel={() => {
                        clearAll();
                        setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' });
                    }}
                />
            )}

            {/* Dialog Overlay */}
            {activeFeature && activeFeature.parameters && !['extrude', 'extrudeFromFace', 'sketchOnFace', 'revolve', 'fillet', 'chamfer', 'union', 'cut', 'intersect', 'offsetPlane', 'planeSelector', 'midplane', 'tangentPlane'].includes(activeDialog || '') && (
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
