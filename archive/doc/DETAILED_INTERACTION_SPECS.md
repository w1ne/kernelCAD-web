# Detailed Interaction Specifications

This document serves as the "Source of Truth" for user interaction patterns in kernelCAD. It defines the exact input sequences (clicks, drags, presses) for every major modeling operation to ensure a consistent, best-in-class user experience.

---

## 1. Global Interaction Principles

### 1.1 Selection Mechanics
| Interaction | Direction | Visual Style | Logic |
| :--- | :--- | :--- | :--- |
| **Window Selection** | **Left-to-Right Drag** | Solid Blue Outline, Semi-transparent Blue Fill | Selects only objects **fully enclosed** by the box. |
| **Crossing Selection** | **Right-to-Left Drag** | Dashed Orange Outline, Semi-transparent Orange Fill | Selects objects **touching or enclosed** by the box. |
| **Add to Selection** | `Shift` + Click/Drag | Cursor `+` Badge | Adds new items to current selection. |
| **Toggle Selection** | `Ctrl`/`Cmd` + Click | - | Inverts selection state of clicked item. |
| **Clear Selection** | Click Empty Space / `Esc` | - | Deselects all. |

### 1.2 Viewport Navigation
*   **Orbit**: `Shift` + Middle Mouse Drag (OR Right Mouse Drag if configured).
*   **Pan**: Middle Mouse Drag.
*   **Zoom**: Mouse Wheel.
*   **Zoom to Fit**: Double-Click Middle Mouse / Hotkey `F`.

---

## 2. Sketching Tools
All sketch tools support **Dynamic Input** (typing values while drawing) and **Auto-Constraint Inference**.

### 2.1 Line Tool (`L`)
*   **Intent**: Draw single segments or continuous chains.
*   **Interaction**:
    1.  **Click 1**: Set Start Point.
    2.  **Move**: Preview line.
        *   *Inference*: Snaps to Vertical/Horizontal axes. Snaps to other geometry points.
        *   *Dynamic Input*: User can type `length` -> `Tab` -> `angle`.
    3.  **Click 2**: Set End Point.
    4.  **Post-Action**: Tool remains active. End Point becomes Start Point for next line.
    5.  **Exit**: Double-Click or `Esc` to end chain but keep tool active.

### 2.2 Rectangle Tools
#### A. Corner Rectangle (`R` / Default)
*   **Intent**: Define by diagonal corners.
*   **Interaction**:
    1.  **Click 1**: Set Corner 1.
    2.  **Move**: Preview box.
    3.  **Click 2**: Set Corner 2.
    *   *Constraints Created*: Horizontal/Vertical on all sides (or Perpendicular/Parallel).

#### B. Center Rectangle
*   **Intent**: Symmetric box around a point.
*   **Interaction**:
    1.  **Click 1**: Set Center Point.
    2.  **Move**: Preview expands symmetrically.
    3.  **Click 2**: Set Corner.
    *   *Constraints Created*: Center point coincident to construction diagonals intersection.

### 2.3 Circle Tools
#### A. Center Circle (`C` / Default)
*   **Interaction**:
    1.  **Click 1**: Center Point.
    2.  **Move**: Define Radius.
    3.  **Click 2**: Set Radius.

#### B. 3-Point Circle
*   **Interaction**:
    1.  **Click 1**: Point A.
    2.  **Click 2**: Point B.
    3.  **Click 3**: Point C (defines curvature).

### 2.4 Slot Tools
#### A. Center-to-Center Slot
*   **Interaction**:
    1.  **Click 1**: Center of Arc A.
    2.  **Click 2**: Center of Arc B (defines length/angle).
    3.  **Move**: Drag mouse perpendicular to line.
    4.  **Click 3**: Define Slot Width/Expanse.

#### B. Center Point Slot
*   **Interaction**:
    1.  **Click 1**: Center of Slot (overall symmetry point).
    2.  **Click 2**: Center of End Arc (defines half-length).
    3.  **Click 3**: Define Width.

### 2.5 Spline (Control Point)
*   **Interaction**:
    1.  **Click 1**: Start Point.
    2.  **Click 2..N**: Add Control Points.
    3.  **Double-Click**: End Spline.
    *   *Handles*: Selecting a spline shows Tangent Handles at control points for adjustment.

---

## 3. Solid Modeling Operations
Features are created via "Property Panels" (Contextual or Sidebar).

### 3.1 Extrude (`E`)
*   **Selection**: One or more Closed Profiles (Faces or Regions).
*   **Interaction**:
    1.  **Select Profile**: If not pre-selected.
    2.  **Drag Handle**: 3D arrow appears at profile centroid. Dragging updates `Distance`.
    3.  **Panel Options**:
        *   *Type*: Blind, Symmetric, Two-Sided, To Object.
        *   *Boolean*: New Body, Join, Cut, Intersect (Auto-detected based on drag direction into/out of solids).

### 3.2 Revolve
*   **Selection**: Profile + Axis.
*   **Interaction**:
    1.  **Select Profile**.
    2.  **Select Axis**: Can be a sketch line or linear edge.
    3.  **Panel Options**: Angle (default 360), Type (Surface/Solid).

### 3.3 Loft
*   **Selection**: Sequential list of Profiles using a "Selection List" UI component.
*   **Interaction**:
    1.  **Click Profile 1**.
    2.  **Click Profile 2**: Preview surface connects them.
    3.  **Click Profile 3+** (Optional): Extends loft.
    4.  **Drag Handles**: Reorder profiles in the list if twisted.
    5.  **Guide Curves (Optional)**: Switch selection box to "Rails/Guides" and select curves to shape the transition.

### 3.4 Sweep
*   **Selection**: Profile + Path.
*   **Interaction**:
    1.  **Select Profile**.
    2.  **Select Path**: Continuous chain of curves.
    3.  **Options**: Twist angle, Taper angle.

---

## 4. Engineering Features (Modifications)

### 4.1 Fillet (`F`)
*   **Smart Selection**:
    *   **Click Edge**: Selects single edge.
    *   **Loop Select**: Double-click edge selects tangent chain.
*   **Widget / HUD**:
    *   Selected edge shows a valid "Radius" handle.
    *   Context Toolbar (FilletXpert style) appears near cursor suggesting:
        *   "Connected Edges"
        *   "All Edges of Feature"
*   **Preview**: Real-time curvature update.

### 4.2 Chamfer
*   **Interaction**: Similar to Fillet.
*   **Options**: Distance (45deg), Two Distances, Distance + Angle.

### 4.3 Shell
*   **Selection**: Faces to remove.
*   **Input**: Wall Thickness.
*   **Preview**: Ghosted internal volume.

---

## 5. Assembly & Mates (Future)
*   **Mate Connector**: Implicit points on geometry (Center of face, Midpoint of edge).
*   **Fasten Mate**: Click Point A, Click Point B. System aligns Z-axes and locks all DOFs.
*   **Slider Mate**: Free Z-translation.
*   **Revolute Mate**: Free Z-rotation.

---

## 6. Construction Geometry
Construction entities provide references for sketching and features.

### 6.1 Offset Plane
*   **Selection**: Planar Face or Plane.
*   **Interaction**:
    1.  **Select Source**: Click face/plane.
    2.  **Drag Handle**: Arrow appears normal to face. Drag to desire distance.
    3.  **Input**: Type specific distance.

### 6.2 Midplane
*   **Selection**: Two Faces (Parallel or Angled).
*   **Interaction**:
    1.  **Click Face 1**.
    2.  **Click Face 2**.
    3.  **Result**: Plane appears exactly between them (-50% distance/angle).

### 6.3 Tangent Plane
*   **Selection**: Cylindrical/Conical Face + (Optional) Angular Reference.
*   **Interaction**:
    1.  **Click Cylinder**.
    2.  **Drag Handle**: Radial handle to rotate plane around cylinder axis.
    3.  **Snap**: Snaps to 0, 90, 180, 270 degrees relative to global axes.

---

## 7. Patterning Tools

### 7.1 Linear Pattern
*   **Selection**: Entities (Features/Faces) to pattern.
*   **Direction Input**:
    1.  **Click Direction 1 Box**.
    2.  **Select Linear Edge/Sketch Line** in viewport.
*   **Interaction**:
    *   **Drag Arrow**: Drag the "Instance Handle" to increase count visually.
    *   **Drag Drop**: Drag the "Spacing Handle" to smooth out spacing.
*   **Preview**: Ghosted copies of the geometry update in real-time.

### 7.2 Circular Pattern
*   **Selection**: Entities + Axis.
*   **Interaction**:
    1.  **Select Axis**: Cylinder face or Line.
    2.  **Options**: Full Revolve (360) or Angle.
    3.  **Handles**: Drag angular handle to change coverage.

### 7.3 Mirror
*   **Selection**: Entities + Plane/Face.
*   **Interaction**:
    *   Immediate preview of mirrored geometry across the plane.

