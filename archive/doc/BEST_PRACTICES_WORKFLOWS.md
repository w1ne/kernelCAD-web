# Best-in-Class CAD Workflows & UX Patterns

This document outlines the research findings on modern, high-efficiency workflows in CAD software (Fusion 360, Onshape, SolidWorks) and creative tools (Blender, Linear). The goal is to guide the development of kernelCAD towards a professional, efficient, and "wow"-inducing user experience.

## 1. The "Canvas-First" Philosophy
Top-tier tools minimize travel time between the mouse and the UI. The user's focus should remain on the object they are designing.

### A. Contextual Toolbars (The "Hover" Menus)
**Reference**: Linear, Notion, SolidWorks Context Menus.
- **Workflow**: When a user selects an entity (Face, Edge, Sketch), a small floating toolbar appears near the cursor.
- **Content**: Only relevant actions for that selection.
  - *Face Selected*: Extrude, Sketch on Face, Shell, Offset.
  - *Edge Selected*: Fillet, Chamfer.
  - *Sketch Curve Selected*: Construction Toggle, Fix, Horizontal/Vertical.
- **Implementation Goal**: Reduce mouse travel to the side panel.

### B. Command Palette (Keyboard-First)
**Reference**: Linear, VS Code, Raycast.
- **Workflow**: `Cmd+K` (or `Ctrl+K`) opens a global search bar.
- **Capabilities**:
  - Run any tool (e.g., "Extrude", "Revolve").
  - Find assets or files.
  - Toggle view modes.
- **Why**: Power users can work significantly faster without hunting for icons.

---

## 2. Sketching Excellence
The sketcher is the heart of parametric CAD. It must be "intelligent" and predict user intent.

### A. Automatic Constraint Inference (The "Magnetic" Feel)
**Reference**: Fusion 360, SolidWorks, Onshape.
- **Workflow**: As the user draws a line:
  - If it's close to vertical, it snaps to vertical and shows a small constraint icon.
  - If the endpoint acts on another line, it snaps to "Coincident".
  - If it's perpendicular to the previous line, it snaps to "Perpendicular".
- **UX**: Visual feedback (icons appear near cursor) confirming the constraint *before* the user clicks.

### B. Dynamic Dimensioning (Type-to-Define)
**Reference**: AutoCAD, Fusion 360.
- **Workflow**: While drawing a Geometry (e.g., a Line), the current length is displayed in a floating input box next to the cursor.
- **Interaction**: The user can simply type `50` and hit Enter to lock the length to 50mm immediately, creating a dimension constraint automatically.
- **Tab Key**: Switch between Length and Angle inputs.

### C. Gesture / Marking Menus
**Reference**: Blender (Pie Menus), SolidWorks (Mouse Gestures).
- **Workflow**: Right-click-drag in a direction to trigger common tools immediately.
  - *Up*: Dimension.
  - *Down*: Trim.
  - *Left*: Line.
  - *Right*: Circle.
- **Muscle Memory**: Allows for "eyes-free" tool switching.

---

## 3. Direct Modeling & Manipulation
Parametric CAD shouldn't feel like filling out forms. It should feel like sculpting with precision.

### A. Push/Pull (The "Press Pull" Workflow)
**Reference**: SketchUp, Fusion 360.
- **Workflow**:
  1. Click a Face.
  2. A "Handle" arrow appears.
  3. Drag the arrow to Extrude (Add) or Cut (Subtract) dynamically.
  4. A floating input box updates with the distance value.
- **Parametric**: Behind the scenes, this creates an `Extrude` feature with the dragged value as a parameter.

### B. "Snap Base" Transforms
**Reference**: Blender 4.0.
- **Workflow**: When moving/rotating, standard gizmos are often insufficient for precise placement.
- **Feature**: Allow picking a "Base Point" (e.g., a vertex on the object) and a "Target Point" (e.g., a vertex on another object) to snap them together perfectly during the move.

---

## 4. Visual Feedback & "Linear-Style" Polish
How the application *feels* is as important as what it does.

### A. Micro-Interactions
- **Hover Effects**: Highlights should be instantaneous and precise.
- **Transition Animations**: Dialogs shouldn't just pop in; they should slide/fade slightly.
- **Snappy Performance**: Zero lag on selection.

### B. Non-Blocking UI
- **Floating Properties**: Instead of modal dialogs that lock the screen, use floating panels that allow the user to pan/zoom/rotate while configuring the feature.

---

## 5. Implementation Roadmap Strategy for kernelCAD

### Phase 1: Interactive Sketching (Current Priority)
1.  **Inference Engine**: Implement a system to detect nearby constraints while hovering (Line-Line proximity, Axis alignment).
2.  **Dynamic Input**: Add HTML overlays for value entry during sketch operations.

### Phase 2: Context Awareness
1.  **Selection Manager**: Enhance specific selection of sub-entities (Face vs Solid).
2.  **Mini-Toolbar**: Implement a React component that positions itself absolutely based on the 3D projection of the selection centroid.

### Phase 3: Direct Manipulation
1.  **Gizmo System**: Implement 3D handles (Three.js objects) that intercept mouse events and drive solver updates.
