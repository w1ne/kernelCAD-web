# Specification: Advanced History & Timeline System

This document outlines the design for a professional-grade parametric history system in kernelCAD, enabling feature re-ordering, deletion, and advanced timeline manipulation.

## Overview
A "History" in CAD is not just a list of variables; it is an ordered sequence of operations that build the final geometry. Users must be able to manipulate this sequence as easily as they manipulate the 3D geometry itself.

## 1. Feature Representation

### 1.1 Beyond Simple Variables
The current system identifies `const x = ...` as an item. We need to formalize this into a **Feature Tree**:
- **Source Code as Truth**: The code remains the source of truth, but we use AST (Abstract Syntax Tree) manipulation to identify functional blocks.
- **Dependency Tracking**: Use AST analysis to determine which features depend on others (e.g., `fillet(box1)` depends on `box1`).

## 2. History Manipulation Operations

### 2.1 Re-ordering (Drag & Drop)
- **Constraint**: A feature can only be moved after its dependencies and before features that depend on it.
- **Implementation**: 
    1. Parse the code into an AST.
    2. Identify the range of lines/nodes for the feature.
    3. Move the node to the new valid position.
    4. Regenerate code from the modified AST.

### 2.2 Removal (Delete)
- **Cascade Check**: If a user deletes `box1`, and `fillet1` depends on it, the system should:
    - Warn the user (breaking change).
    - Or delete the dependents as well (cascading delete).
- **Implementation**: Remove the corresponding variable declaration and its usage from the code via AST manipulation.

### 2.3 Suppression (Suppress/Unsuppress)
- Momentarily "comment out" or bypass a feature without deleting its code.

## 3. UI/UX: The Timeline

### 3.1 Timeline UI (v1.0 Design)
- A horizontal timeline at the bottom of the workspace.
- Chronological order from left to right.
- **Rollback Bar**: A playhead that can be dragged back to see the model state at that point in history (Rollback/Time Travel).

### 3.2 Enhanced Scene Browser
- The "History" section should be a vertical representation of the timeline.
- Inline actions: Hide/Show (Eye icon), Delete (Trash icon), Suppress.
- Visual nesting for features that modify other features (e.g., a Fillet nested under the Box it modifies).

## 4. Technical Implementation Strategy

- **AST-First Workflow**: Use `acorn` and `escodegen` (or similar) to perform surgical edits on the source code.
- **Feature Identifiers**: Each feature should have a unique internal ID mapped to its variable name.
- **Refactoring Engine**: A dedicated service to handle renaming and re-ordering across the entire script.

---

## Roadmap Mapping
This system is the core of **Phase 2: Feature History & Timeline**. It transforms kernelCAD from a "modeling tool" into a "design platform".
