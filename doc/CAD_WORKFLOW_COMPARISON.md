# CAD Workflow Comparison

Comparing kernelCAD's target workflow with industry-standard CAD systems.

---

## Fusion 360 / CATIA / NX Standard Workflow

### Typical Bracket Creation Workflow

**1. Start Sketch**
```
File → New Sketch → Select Plane (XY)
```
- Visual canvas opens on selected plane
- Grid and origin visible
- 2D drawing tools appear in toolbar

**2. Draw Profile**
```
Tools: Line → Rectangle → Circle
```
- Click points to define geometry
- Constraints auto-apply (horizontal/vertical/parallel)
- Dimensions appear (20mm, 45°, R5)

**3 Dimension Sketch**
```
Edit → Smart Dimension
```
- Click edge → enter value (20mm)
- Parametric: change dimension → sketch updates
- Constraints turn blue (fully constrained)

**4. Extrude**
```
Modify → Extrude → Distance: 10mm → OK
```
- 3D preview shows operation
- Options: New Body / Join / Cut
- Solid geometry created

**5. Add Features**
```
Modify → Fillet → Select Edges → R2 → OK
Create → Pattern → Circular → Axis + Count → OK
```
- Each operation appears in feature tree
- Can re-edit any previous step

**6. View Controls**
```
View → Visual Style → Shaded with Edges
View → Section Analysis → Add Plane
```
- 6+ visualization modes
- Real-time section planes

---

## kernelCAD Current Workflow (v0.6.1)

### Same Bracket Creation (Current State)

**1. Start Sketch on Plane or Face**
```
GUI → Sketch → Select Plane: XY (or click a face)
```
- ✅ Visual sketch canvas with grid
- ✅ Tools: Line, Rectangle, Circle
- ✅ Click-to-draw interface

**2. Draw Profile on Canvas**
```
Tools: Line → Rectangle → Circle
```
- ✅ Click points to define geometry
- ✅ Visual feedback in real-time
- ✅ Code auto-generated via AST

**3. Extrude with Dialog**
```
3D → Extrude → Distance: 10mm → OK
```
- ✅ Dialog with distance input
- ✅ Code generated: `sketch.extrude(10)`

**4. Add Features**
```
Modify → Fillet → Select Edges → R2 → OK
Modify → Revolve → Select Axis → Angle → OK
```
- ✅ Fillet and Chamfer with edge selection
- ✅ Revolve operation
- ✅ Boolean operations (Union, Subtract, Intersect)

**5. View Modes**
```
View → Shaded with Edges / Wireframe / Shaded
```
- ✅ Professional CAD view modes
- ✅ Toggleable sketch visibility (blue lines)

---

## kernelCAD Target Workflow (v0.3-0.5)

### Same Bracket with Planned Features

**1. Start Sketch** (v0.3)
```
GUI → Sketch → Select Plane: XY
```
- 2D canvas overlay appears
- Grid visible, snap to grid enabled
- AST generates: `const sketch1 = startSketch('XY')`

**2. Draw Profile** (v0.3)
```
Tools: Line | Rectangle | Circle
```
- Click on canvas → draws visual shape
- Auto-constrains (vertical lines snap to 90°)
- Dimensions editable in UI
- Code updates live:
  ```javascript
  .hLine(20).vLine(40).hLine(-20).close()
  ```

**3. Dimension** (v0.3)
```
Double-click dimension → Enter "width" → Creates parameter
```
- AST inserts: `const width = 20;`
- Sketch updates: `.hLine(width)`
- **Parametric**: Change `width` → model rebuilds

**4. Extrude** (v0.3.1)
```
3D → Extrude Sketch → Distance: 10mm → Join → OK
```
- Dialog with distance input
- Preview shows 3D result
- AST generates:
  ```javascript
  const base = sketch1.extrude(10);
  return [base];
  ```

**5. Add Features** (v0.3.2 + v0.5)
```
Modify → Fillet → Click edges in 3D → R2 → OK
Pattern → Circular → Axis: Z, Count: 4
```
- Visual edge selection (highlights)
- Feature tree updates
- Undo/Redo per operation

**6. View Controls** (v0.4)
```
View → Shaded with Edges
View → Wireframe
```
- ✅ 6+ view modes
- ✅ Section analysis
- ✅ Grid/axis display

---

## Feature Parity Checklist

### Essential for Basic CAD Workflow

| Feature | CATIA/Fusion | kernelCAD v0.6.1 | Target (v0.7-0.8) |
|---------|--------------|------------------|-------------------|
| **Visual Sketch Canvas** | ✅ | ✅ | Done |
| **2D Constraint Solver** | ✅ | ❌ | v0.7 |
| **Dimension Input UI** | ✅ | ⚠️ (basic) | v0.7 |
| **Extrude Dialog** | ✅ | ✅ | Done |
| **Wireframe View** | ✅ | ✅ | Done |
| **Shaded with Edges** | ✅ | ✅ | Done |
| **Edge Selection** | ✅ | ✅ (filter-based) | Done |
| **Revolve** | ✅ | ✅ | Done |
| **Face Sketching** | ✅ | ✅ | Done |
| **Transform Gizmos** | ✅ | ❌ | v0.8 |
| **Feature Tree Editing** | ✅ | ⚠️ (read-only) | v0.8 |
| **Parameters Panel** | ✅ | ⚠️ (manual vars) | v0.7 |

### Advanced (Post-v0.5)

- [ ] Assembly constraints (mates/joints)
- [ ] Sheet metal workflows
- [ ] CAM toolpaths
- [ ] Simulation (FEA)
- [ ] Collaboration (multi-user)

---

## Key Insight: "Sketch-First" Paradigm

**Professional CAD** = **Sketch → Extrude → Modify**

99% of industrial CAD models start with:
1. **2D Sketch** (constrained profile)
2. **3D Operation** (extrude/revolve/sweep)
3. **Features** (fillets, holes, patterns)

**Current Gap**: kernelCAD has #3 (features via code) but lacks #1 (sketch UI) and #2 (extrude dialog).

**Priority**: Sketch system (v0.3) unlocks the entire workflow.

---

## Why Replicad is a Good Foundation

✅ **Already Has Sketcher API**:
```javascript
const sketch = new Sketcher()
  .hLine(20).vLine(40).close();
```

✅ **Extrude/Revolve/Sweep** all work via code

❌ **Missing**: Visual UI layer on top of the API

**Our Job**: Build the GUI that generates this code visually
