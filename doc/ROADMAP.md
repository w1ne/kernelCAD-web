# kernelCAD Roadmap 3.0: Professional CAD Workflow

> Building a CATIA/Fusion360-class parametric CAD system in the browser

This roadmap focuses on achieving feature parity with professional CAD tools through foundational sketch-extrude workflows and visualization modes.

---

## ✅ COMPLETED: Foundation (v0.1-0.2)

### Architecture & Core Systems
- [x] **Workbench Architecture**: Modular layout system (Header, SidePanel, Workspace)
- [x] **AST-Based Code Manipulation**: Syntax-aware insertion with `acorn` parser
- [x] **Command Pattern**: Undo/Redo support with `CommandManager`
- [x] **Feature Registry**: Pluggable primitive system (Box, Cylinder, Sphere)
- [x] **Scene Browser**: Fusion 360-style feature tree with "Jump to Code"
- [x] **Test Coverage**: 77 tests (39 AST + 38 integration)

### Current Limitations
- ⚠️ **Primitives Only**: No sketch-based modeling workflow
- ⚠️ **Single View Mode**: Missing wireframe/shaded/x-ray modes
- ⚠️ **No Positioning**: Shapes stack at origin, need manual `.translate()`
- ⚠️ **No Constraints**: No dimensional or geometric constraints

---

## 🎯 PHASE 1: CAD Fundamentals (v0.3-0.4) - CURRENT PRIORITY

**Goal**: Match the core Sketch → Extrude → Modify workflow of Fusion360/CATIA

### 1.1 Sketching System (v0.3.0)
**Target**: Parametric 2D sketch creation with constraints

- [ ] **Sketch Plane Selection**
  - [ ] XY, XZ, YZ planes
  - [ ] Face selection from existing geometry
  - [ ] Offset plane definition
  
- [ ] **2D Sketch Tools** (Replicad `Sketcher` API wrapper)
  - [ ] Line (hLine, vLine, lineTo)
  - [ ] Arc/Circle
  - [ ] Rectangle
  - [ ] Polygon
 - [ ] Spline
  
- [ ] **Geometric Constraints** (Auto-inference + Manual)
  - [ ] Horizontal/Vertical
  - [ ] Parallel/Perpendicular
  - [ ] Tangent/Concentric
  - [ ] Equal length/radius
  
- [ ] **Dimensional Constraints**
  - [ ] Distance/Length
  - [ ] Radius/Diameter
  - [ ] Angle
  - [ ] **Parameter-driven** (e.g., `width = 10`)

- [ ] **Sketch UI**
  - [ ] 2D canvas overlay for visual sketching
  - [ ] Constraint indicators (Fusion360-style icons)
  - [ ] Dimension input fields
  - [ ] AST code generation: `const sketch1 = startSketch('XY').line([0,0], [10,0])...`

### 1.2 3D Operations (v0.3.1)
**Target**: Convert sketches to solid geometry

- [ ] **Extrude**
  - [ ] Distance (fixed value or parameter)
  - [ ] Direction (normal, reversed, both)
  - [ ] Operation (New Body, Join, Cut, Intersect)
  - [ ] Taper angle
  
- [ ] **Revolve**
  - [ ] Axis selection
  - [ ] Angle (full 360° or partial)
  
- [ ] **Sweep**
  - [ ] Path selection
  - [ ] Guide curves
  
- [ ] **Loft**
  - [ ] Multi-profile selection
  - [ ] Guide rails

### 1.3 Positioning & Assembly (v0.3.2)
**Fix**: Shapes currently stack at origin

- [ ] **Transform Dialog**
  - [ ] Translate (X, Y, Z inputs)
  - [ ] Rotate (Axis + Angle)
  - [ ] Scale
  
- [ ] **Smart Positioning**
  - [ ] Auto-offset new features
  - [ ] Snap to edges/faces/vertices
  - [ ] Alignment constraints
  
- [ ] **Multi-Body Support**
  - [ ] Component/Assembly tree
  - [ ] Mates/Joints (Fusion360-style)

---

## 🔭 PHASE 2: Visualization & Interaction (v0.4.0)

**Goal**: Professional-grade view controls matching CATIA/NX

### 2.1 View Modes
- [ ] **Shaded** (current default - solid with lighting)
- [ ] **Wireframe** (edges only, black lines)
- [ ] **Shaded with Edges** (most common in CAD)
- [ ] **X-Ray** (transparent with edges)
- [ ] **Hidden Line Removed**
- [ ] **Zebra Stripes** (curvature analysis)

### 2.2 Display Settings
- [ ] **Edge Display**
  - [ ] Visible edges
  - [ ] Hidden edges (dashed)
  - [ ] Tangent edges (hide/show)
  
- [ ] **Grid & Axes**
  - [ ] Origin triad (XYZ arrows)
  - [ ] Grid plane display
  - [ ] Unit labels

### 2.3 Camera Controls
- [ ] **Standard Views**
  - [ ] Front, Back, Left, Right, Top, Bottom
  - [ ] Isometric, Trimetric
  - [ ] Custom view save/recall
  
- [ ] **Sectioning**
  - [ ] Section plane (slice view)
  - [ ] Half-section
  - [ ] Multi-plane section

---

## 🚀 PHASE 3: Advanced Features (v0.5.0+)

### 3.1 Feature Tree Management
- [ ] **Drag-and-Drop Reordering** (history-based modeling)
- [ ] **Suppress/Unsuppress Features**
- [ ] **Edit Feature** (double-click to modify parameters)
- [ ] **Feature Rename** (AST refactoring)
- [ ] **Rollback** (view model at any point in history)

### 3.2 Parameters & Expressions
- [ ] **Global Parameters**
  - [ ] Variables panel (like Fusion360)
  - [ ] User-defined parameters (`width = 10`)
  - [ ] Expressions (`holeSpacing = width / 3`)
  
- [ ] **Linked Dimensions**
  - [ ] Update parameter → model rebuilds
  - [ ] Dependency graph visualization

### 3.3 Advanced Operations
- [ ] **Patterns**
  - [ ] Linear pattern
  - [ ] Circular pattern
  - [ ] Mirror
  
- [ ] **Shell/Thicken**
  - [ ] Hollow out solid
  - [ ] Variable thickness
  
- [ ] **Draft**
  - [ ] Tapered faces for molding
  
- [ ] **Split Body/Face**
  - [ ] Trim surfaces
  - [ ] Boolean fragments

### 3.4 Gizmos & Direct Manipulation
- [ ] **Transform Gizmos** (Three.js TransformControls)
  - [ ] Move arrows (X/Y/Z)
  - [ ] Rotate rings
  - [ ] Scale handles
  - [ ] Updates code: `.translate(x, y, z)`
  
- [ ] **Dimension Handles**
  - [ ] Drag to resize extrusion
  - [ ] Live dimension display

---

## 📊 Feature Comparison Matrix

| Feature | kernelCAD (Current) | Target (Fusion360) |
|---------|---------------------|-------------------|
| **Sketch Creation** | ❌ Manual code | ✅ Visual canvas |
| **Geometric Constraints** | ❌ None | ✅ Auto-inference |
| **Extrude** | ❌ Code only | ✅ Dialog + preview |
| **View Modes** | ⚠️ Shaded only | ✅ 6+ modes |
| **Feature Tree** | ✅ Read-only | ✅ Editable |
| **Undo/Redo** | ✅ Code only | ✅ Operations |
| **Parameters** | ⚠️ Manual variables | ✅ Managed panel |
| **Gizmos** | ❌ None | ✅ Full 3D manipulation |
| **Assembly** | ❌ None | ✅ Mates/Joints |

---

## 🗓️ Release Schedule

| Version | Focus | ETA |
|---------|-------|-----|
| **v0.3.0** | Sketching System | 2-3 weeks |
| **v0.3.1** | Extrude/Revolve | 1-2 weeks |
| **v0.3.2** | Positioning/Transforms | 1 week |
| **v0.4.0** | View Modes (Wireframe, etc.) | 2 weeks |
| **v0.5.0** | Parameters & Patterns | 3-4 weeks |

---

## 🏗️ Technical Implementation Notes

### Sketching Architecture
```typescript
// Feature Registry Addition
const SketchFeature = {
  id: 'sketch',
  label: 'Sketch',
  codeTemplate: (params) => `
    const ${params.name} = startSketch('${params.plane}')
      ${params.entities.map(e => e.toCode()).join('\n      ')}
      .close();
  `
};
```

### View Mode Implementation
```typescript
// Material system (Three.js)
const viewModes = {
  shaded: new MeshStandardMaterial({ color, roughness, metalness }),
  wireframe: new LineBasicMaterial({ color: 0x000000 }),
  shadedWithEdges: edges + mesh,
  xray: new MeshBasicMaterial({ transparent: true, opacity: 0.3 })
};
```

### Constraint Solver Integration
- **Option 1**: Integrate `solvespace.js` (C++ port to WASM)
- **Option 2**: Use `planarity.js` (2D constraint solver)
- **Option 3**: Build minimal solver for basic constraints

---

## 🎯 Success Metrics

### v0.3 (Sketch + Extrude)
- [ ] User can create a bracket using only GUI (no manual code)
- [ ] Workflow: Sketch → Dimension → Extrude → Fillet
- [ ] Matches Fusion360 tutorial complexity

### v0.4 (Visualization)
- [ ] All 6+ view modes working
- [ ] Wireframe performance: 60fps for 10k edges
- [ ] Screenshot exports in all modes

### v0.5 (Parameters)
- [ ] Parameter-driven model updates in <1s
- [ ] Dependency graph with 20+ linked dimensions
- [ ] Pattern operation with 50+ instances

---

## Priority Order (Next 3 Months)

1. **Immediate** (This Week): Fix primitive positioning issue
2. **Short-Term** (2-3 Weeks): Sketch plane + basic 2D tools
3. **Medium-Term** (1 Month): Extrude with distance parameter
4. **Long-Term** (2-3 Months): Wireframe view + constraint solver