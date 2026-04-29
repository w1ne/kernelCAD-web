# Visual Feedback & Micro-Interaction System

This document defines the "Visual Language" of kernelCAD. It specifies how the system communicates state to the user through cursors, highlights, and overlays. The goal is a "tactile," responsive feel similar to Linear or high-end creative tools, avoiding the "dead" feel of older CAD systems.

## 1. Selection & Hover States
### 1.1 Pre-Selection (Hover)
*   **Trigger**: Mouse enters bounding box of an entity.
*   **Visual Style**:
    *   **Edges**: Thicken to 2px, Color: `var(--highlight-orange)`.
    *   **Faces**: 50% opacity overlay of `var(--highlight-blue)`.
    *   **Vertices**: Render a filled circle (r=4px).
*   **Priority (Z-Index)**: Vertices > Edges > Faces. If hovering a vertex, do NOT highlight the face behind it.

### 1.2 Active Selection
*   **Trigger**: Click on a pre-selected entity.
*   **Visual Style**:
    *   **Edges**: Solid `var(--selection-blue)`, 2px width.
    *   **Faces**: Solid `var(--selection-blue)` with 30% alpha fill.
    *   **Persistent**: Remains until deselected or click-away.

### 1.3 "Locked" / Inference Selection
*   **Trigger**: Holding `Shift` to lock inference to a specific face/feature.
*   **Visual Style**:
    *   **Outline**: Dashed line animation (marching ants) around the locked feature.
    *   **Cursor Badge**: Small "Lock" icon next to cursor.

---

## 2. Snapping & Inference Cues
The "Magnetic" feel of the sketcher relies effectively communicating *why* the cursor snapped to a location.

### 2.1 Snap Markers
When the cursor snaps to a geometric property, render these SVG icons at the snap point (Color: `var(--snap-green)`):
| Snap Type | Icon Shape |
| :--- | :--- |
| **Endpoint** | Square (filled) |
| **Midpoint** | Triangle |
| **Center** | Circle |
| **Intersection** | X |
| **Quadrant** | Diamond |
| **Nearest** | Hourglass / Bowtie |
| **Tangent** | Circle with Tangent Line |
| **Perpendicular** | Right Angle bracket |

### 2.2 Alignment Guidelines
*   **Extension Lines**: When aligning to a point (e.g., vertical to a circle center), render a **Dashed Infinite Line** (Color: `var(--guide-grey)`, Opacity: 0.5).
*   **Dynamic Dimensions**:
    *   While drawing, if the length matches a round number (e.g., 50.00), turn the dimension text **Bold Green**.

---

## 3. Cursor System
The cursor is the user's primary tool. It should morph to indicate capability.

### 3.1 Base States
*   **Default**: `default` (Arrow).
*   **View Manipulation**: `grab` (Open Hand) -> `grabbing` (Closed Hand on drag).
*   **Processing/Busy**: Small abstract spinner badge (Not system hourglass).

### 3.2 Tool-Specific Suggestion Badges
Render a small 16x16 icon to the bottom-right of the cursor ptr.
*   **Sketching**: Small Pencil.
*   **Dimensioning**: Small Ruler.
*   **Fillet**: Small Rounded Corner.
*   **Eraser/Trim**: Small Scissors.

### 3.3 Negative Feedback
*   **Invalid Operation**: If hovering an invalid selection for the active tool (e.g., Fillet tool over a Face instead of Edge), show `not-allowed` (Circle-Slash) cursor.

---

## 4. On-Canvas Manipulators (Gizmos)
Avoid abstract inputs where possible. Use direct manipulation.

### 4.1 Linear Drag Handles (Extrude/Plane)
*   **Appearance**: Cone-tipped arrow. Color: `var(--primary-axis-color)`.
*   **Interaction**:
    *   **Hover**: Scale up 1.2x, highlight brighter.
    *   **Drag**: Hide cursor, lock mouse to axis.
    *   **Ruler**: Show a graduated ruler track alongside the drag vector.

### 4.2 Application Toolbars (Context)
*   **Position**: Floating, 20px above the cursor/selection centroid.
*   **Animation**: `Framer Motion` spring enter.
*   **Behavior**: Fade out after 500ms of mouse inactivity away from toolbar.

---

## 5. Text & Input Overlays
### 5.1 Dynamic Input Fields
*   **Style**: Glassmorphism background (Blur 10px, White 80%).
*   **Font**: Monospace (JetBrains Mono), standard size.
*   **Validation**:
    *   **Valid**: White text.
    *   **Scanning**: Formatting as typing (e.g., "50/2" evaluates to "25").
    *   **Error**: Red text, shake animation.

---

## Implementation Colors (Theme Token Reference)
```css
:root {
  --highlight-orange: #FF9F1C;
  --selection-blue: #2EC4B6;
  --snap-green: #00FF9D;
  --guide-grey: #AAB3C2;
  --error-red: #FF4D4D;
}
```
