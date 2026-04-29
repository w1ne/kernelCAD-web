# Competitive Analysis: kernelCAD vs. Alternatives

This document outlines how **kernelCAD** compares to other browser-based CAD solutions, specifically **CascadeStudio** and **Chilli3D**.

## Executive Summary

| Feature | **kernelCAD** | **CascadeStudio** | **Chilli3D** |
| :--- | :--- | :--- | :--- |
| **Primary Paradigm** | **Hybrid Code-CAD**<br>Code-first with interactive visual feedback (face selection, sketching). | **Pure Code-CAD**<br>Scripting + GUI parameter sliders. | **Traditional GUI**<br>Mouse-driven modeling (icons, drag-and-drop). |
| **Geometry Kernel** | **OpenCASCADE** (via `replicad`)<br>Fluent, chainable API (e.g., `.extrude().fillet()`). | **OpenCASCADE** (via `opencascade.js`)<br>Mix of wrappers and raw OCCT calls. | **OpenCASCADE** (WASM)<br>Hidden behind GUI operations. |
| **Interface & UX** | **Modern / Premium**<br>React, Tailwind, Dark Mode. Focus on "tactile" feedback. | **Functional / Scientific**<br>Standard developer tool feel (Tweakpane). | **Classic CAD**<br>Ribbons, toolbars, scenegraph panels. |
| **Interaction** | **High**<br>Bidirectional: Code generates 3D; 3D selection generates code refs. | **Medium**<br>Uni-directional: Code -> 3D View. | **High (Traditional)**<br>Direct manipulation via mouse. |

---

## Detailed Comparison

### 1. vs. CascadeStudio

**CascadeStudio** is the closest direct competitor. It is essentially "OpenSCAD with a BREP kernel."

*   **Similarities**:
    *   Both run OpenCASCADE in the browser via WebAssembly.
    *   Both use a code-editor-on-left, 3D-view-on-right layout.
    *   Both allow parametric modeling.

*   **kernelCAD Advantages**:
    *   **Modern API**: Built on `replicad`, offering a jQuery-like chainable API that is easier to read and write than the verbose OCCT bindings.
    *   **Hybrid Workflow**: kernelCAD bridges the gap between code and mouse. You can select a face in the 3D view to start a sketch on it, whereas CascadeStudio is strictly code-to-view.
    *   **Visual Polish**: A focus on "tactile" interactions (snapping, pre-selection highlighting, modern rendering) makes it feel like a product, not just a tech demo.

### 2. vs. Chilli3D

**Chilli3D** is a traditional CAD tool ported to the browser.

*   **Difference in Audience**:
    *   **Chilli3D** targets users of SolidWorks/Onshape who want a traditional point-and-click interface.
    *   **kernelCAD** targets developers and "makers" who prefer the precision and version-controllability of code (Code-CAD), but don't want to lose the visual intuition of 3D modeling.

*   **kernelCAD Position**:
    *   kernelCAD avoids the complexity of building a full GUI for every CAD operation. Instead, it leverages the power of JavaScript for logic (loops, variables) while using the UI strictly for *visualization* and *selection*.

## Conclusion

**kernelCAD** is positioned as the **"Linear/Figma of Code-CAD."** It combines the power of algorithmic design with the usability of modern design tools, occupying a unique middle ground between the raw scripting of CascadeStudio and the manual labor of Chilli3D.
