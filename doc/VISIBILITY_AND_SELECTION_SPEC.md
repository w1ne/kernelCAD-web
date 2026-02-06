# Specification: Visibility and Selection System

This document outlines the design for the per-object visibility control and selection system in kernelCAD.

## Overview
Every object in the scene (Solids, Sketches, Planes) must be independently hidable and selectable from both the **Scene Browser** and the **3D Viewer**.

## 1. Object Visibility Control

### 1.1 Requirements
- Each object (Solid, Sketch, Plane) should have a toggleable visibility state.
- Hiding an object should remove it from the 3D Viewer but keep it in the Scene Browser.
- The Scene Browser should display an "Eye" (visible) or "Eye Off" (hidden) icon for each item.
- Visibility state should be persisted across sessions (optional but recommended).

### 1.2 Implementation (Proposed)
- **State Management**: `SelectionContext` will maintain a `hiddenIds` Set or a Record of visibility states.
- **Scene Browser**: 
    - History items (Solids) and Construction items (Planes) will show a visibility toggle.
    - Clicking the toggle will update the `hiddenIds` set.
- **Viewer**:
    - The `Viewer` component will filter out entities whose IDs are in the `hiddenIds` set.
    - High-level `Shape` components and `SketchLine` components will respect this state.

## 2. Universal Selection System

### 2.1 Requirements
- All top-level objects (not just faces/edges) must be selectable.
- Selecting an object in the Scene Browser should highlight it in the 3D Viewer.
- Selecting an object in the 3D Viewer should highlight it in the Scene Browser.
- Selection should drive the "Properties Panel" for the selected object (future).

### 2.2 Implementation (Proposed)
- **State Management**: `SelectionContext` will track `selectedItemId: string | null`.
- **Scene Browser**:
    - Clicking an item will set `selectedItemId`.
    - Selected items will have a distinct background/text color.
- **Viewer**:
    - Interaction with high-level meshes (not sub-faces) will trigger selection if no sub-element (face/edge) is specifically targeted.
    - Selected objects will render with a "Selection Blue" highlight or outline.

## 3. UI/UX Details

### 3.1 Scene Browser Icons
- **Visibility**: Use `Eye` and `EyeOff` from `lucide-react`.
- **Selection**: Full-width highlight bar with white text.

### 3.2 Visual Feedback
- **Highlighting**: Use the existing `selection-blue` (0x2EC4B6) for selected objects.
- **Hover**: Subtle highlighting when hovering over items in the browser or viewer.

---

## Roadmap Mapping
This feature is a prerequisite for **Phase 2: Feature History & Timeline** and **Phase 3: Direct Manipulation**.
