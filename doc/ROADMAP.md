# kernelCAD Roadmap

> Building a professional parametric CAD system in the browser

**Current Version**: v0.4.0  
**Status**: Phase 2 (Visualization) - In Progress

---

## ✅ COMPLETED

### v0.1-0.2: Foundation & Architecture
- [x] Workbench layout system (Header, SidePanel, Workspace)
- [x] AST-based code manipulation with `acorn` parser
- [x] Command Pattern with Undo/Redo support
- [x] Feature Registry for primitives (Box, Cylinder, Sphere)
- [x] Scene Browser with "Jump to Code"
- [x] 85 unit tests (100% passing)

### v0.4.0: CAD-Style Visualization ✨ **NEW**
- [x] **3 Professional View Modes**:
  - [x] Shaded with Edges (default) - flat shading + black edges
  - [x] Wireframe - geometric edges only (NOT mesh tessellation)
  - [x] Shaded - smooth surfaces
- [x] **CAD Materials**: MeshLambertMaterial (matte, no PBR)
- [x] **CAD Lighting**: Headlight + bright ambient (no shadows)
- [x] **View Mode UI**: Toggle buttons in Header
- [x] **Edge Rendering**: EdgesGeometry with 15° threshold
- [x] **Tests**: 14 new unit tests for materials & lighting

---

## 🎯 PHASE 1: Sketch-Based Modeling (v0.3.x)

**Goal**: Sketch → Extrude workflow like Fusion360/CATIA

### 1.1 Sketching System (v0.3.0)
- [ ] **Sketch Plane Selection**
  - [ ] XY, XZ, YZ planes
  - [ ] Face selection from existing geometry
  
- [ ] **2D Sketch Tools**
  - [ ] Line (horizontal, vertical, arbitrary)
  - [ ] Arc/Circle
  - [ ] Rectangle
  - [ ] Polygon
  
- [ ] **Constraints**
  - [ ] Geometric: Horizontal, Vertical, Parallel, Perpendicular
  - [ ] Dimensional: Distance, Radius, Angle
  - [ ] Parameter-driven (e.g., `width = 10`)
  
- [ ] **Sketch UI**
  - [ ] 2D canvas overlay for visual sketching
  - [ ] Constraint indicators
  - [ ] AST code generation: `startSketch('XY').line(...)`

### 1.2 3D Operations (v0.3.1)
- [ ] **Extrude**: Distance, direction, taper
- [ ] **Revolve**: Axis, angle
- [ ] **Sweep**: Path, guide curves
- [ ] **Loft**: Multi-profile

### 1.3 Modifiers (v0.3.2)
- [ ] **Fillet**: Edge selection, radius
- [ ] **Chamfer**: Edge selection, distance
- [ ] **Shell**: Face removal, thickness
- [ ] **Draft**: Angle for molding

---

## 🔭 PHASE 2: Visualization & Interaction (v0.4.x)

**Status**: Partially Complete (v0.4.0 shipped)

### ✅ 2.1 View Modes (v0.4.0 - DONE)
- [x] Shaded with Edges (default)
- [x] Wireframe (geometric edges)
- [x] Shaded (smooth surfaces)

### 2.2 Advanced View Modes (v0.5.0)
- [ ] **Hidden Line Removed** (wireframe with occlusion)
- [ ] **X-Ray** (transparent surfaces, visible edges)
- [ ] **Faceted** (show mesh triangulation for debugging)

### 2.3 Display Settings (v0.6.0)
- [ ] **Edge Controls**
  - [ ] Edge thickness adjustment (1-5px)
  - [ ] Tangent edge toggle (show/hide)
  - [ ] Silhouette edges
  
- [ ] **Grid & Axes**
  - [ ] Origin triad (XYZ arrows, RGB colors)
  - [ ] Grid plane (fade with distance)
  - [ ] Unit display (mm/in toggle)

### 2.4 Camera Controls (v0.7.0)
- [ ] **Standard Views** (orthographic)
  - [ ] Front, Back, Left, Right, Top, Bottom
  - [ ] Isometric (default 3D)
  - [ ] Home view (fit all)
  
- [ ] **Projection Toggle**
  - [ ] Orthographic (default, no distortion)
  - [ ] Perspective (optional)
  
- [ ] **Section Plane**
  - [ ] Single plane slice
  - [ ] Half-section
  - [ ] Hatch fill pattern

### 2.5 Keyboard Shortcuts (v0.4.4)
- [ ] View modes: `1` (Shaded+Edges), `2` (Wireframe), `3` (Shaded)
- [ ] Standard views: `F` (Front), `T` (Top), `R` (Right), etc.
- [ ] Frame all: `Home`
- [ ] Toggle projection: `P`

---

## 🕐 PHASE 2.5: Feature History & Timeline (v0.8.0)

**Goal**: Parametric editing with automatic rebuild (Fusion360/CATIA-style)

> **Note**: This is a MAJOR feature warranting a full minor version (0.8.0), not a patch release

### 2.5.1 Timeline UI
- [ ] Timeline panel (bottom of screen)
- [ ] Feature cards with icons + names
- [ ] Playhead for "time travel"
- [ ] Drag-and-drop reordering

### 2.5.2 Feature Editing
- [ ] Parameter editing dialog
- [ ] Automatic rebuild on parameter change
- [ ] Feature operations: Suppress, Delete, Rename
- [ ] Undo/redo for editing

### 2.5.3 Rebuild System
- [ ] Dependency graph (DAG)
- [ ] Incremental rebuild (cache valid nodes)
- [ ] Error handling (broken feature doesn't break model)
- [ ] Performance: <500ms for typical model

### 2.5.4 Code Synchronization
- [ ] History → Code generation via AST
- [ ] Code → History parsing
- [ ] Bidirectional sync
- [ ] Conflict resolution UI

### 2.5.5 Advanced History
- [ ] Playhead interaction (view history states)
- [ ] Comparison mode (before/after)
- [ ] History export/import (JSON)

---

## 🎨 PHASE 3: Parameters & Advanced Features (v0.9.0+)

**Long-term goals**

### 3.1 Parameters Panel (v0.5.0)
- [ ] User-defined variables (`width = 10`)
- [ ] Expressions (`holeSpacing = width / 3`)
- [ ] Update → automatic rebuild
- [ ] Dependency visualization

### 3.2 Patterns (v0.5.1)
- [ ] Linear pattern (count, spacing)
- [ ] Circular pattern (axis, count)
- [ ] Mirror (plane selection)

### 3.3 Transform Gizmos (v0.5.2)
- [ ] Move arrows (X/Y/Z)
- [ ] Rotate rings
- [ ] Scale handles
- [ ] Snap to grid/axes

### 3.4 Measurement Tools (v0.5.3)
- [ ] Distance measurement
- [ ] Angle measurement
- [ ] Area/volume
- [ ] Center of mass

---

## 🚀 PHASE 4: Assembly & Collaboration (v0.6.x+)

**Long-term goals**

### 4.1 Multi-Body & Assembly
- [ ] Component tree
- [ ] Mates/Joints (Fusion360-style)
- [ ] Assembly constraints
- [ ] Collision detection

### 4.2 Import/Export
- [ ] STEP export (already working)
- [ ] STL export (already working)
- [ ] STEP import
- [ ] IGES support

### 4.3 Collaboration (Future)
- [ ] Save/load projects
- [ ] Cloud storage
- [ ] Version control
- [ ] Sharing & permissions

---

## 📋 Priority Order (Next 6 Months)

**Semantic Versioning**: MAJOR.MINOR.PATCH
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.x.y): Bug fixes only

1. **v0.5.0**: Advanced View Modes (Hidden Line, X-Ray) - 2 weeks
2. **v0.6.0**: Display Settings (Edge controls, Grid/Axes) - 2 weeks  
3. **v0.7.0**: Camera Controls (Standard views, Projection) - 2 weeks
4. **v0.8.0**: Feature History System (Timeline + Rebuild) - 8 weeks ⭐ **Critical**
5. **v0.9.0**: Parameters & Patterns - 4 weeks
6. **v0.10.0**: Sketching System - 6 weeks

**Note**: Phase 1 (Sketching) deferred until after History, as History is foundational infrastructure needed for parametric sketch editing.

---

## 🎯 Success Metrics

### User Experience
- Edit any feature → model rebuilds in <500ms
- 3D view runs at 60fps with 100+ features
- Zero crashes or data loss
- Keyboard shortcuts for all common operations

### Feature Parity
- Match Fusion360 for sketch-extrude workflow
- Match CATIA for parametric editing (history tree)
- Match SolidWorks for visualization modes

### Code Quality
- 90%+ test coverage
- All modules isolated and testable
- Comprehensive documentation
- Clean, maintainable architecture

---

**Last Updated**: 2026-01-26  
**Next Review**: After v0.4.5 (Feature History) ships