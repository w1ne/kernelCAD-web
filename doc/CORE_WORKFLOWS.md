# Core Workflows (MVP Spec)

To build a "serious" parametric CAD (even an MVP), we must implement a specific set of **Primitive Workflows**. These are the atomic loops a user performs to create geometry.

In `kernelCAD`, because we are building a **hybrid (Code + GUI)** tool, every workflow has two representations: the **Interactive Action** (what the mouse does) and the **Code Artifact** (what gets written to the editor).

Here are the 5 Core Workflows required for v0.1 MVP.

## 1. The "Sketch-Profile" Workflow

*Definition:* Creating a 2D closed loop on a planar surface to serve as the foundation for a 3D solid.

* **User Action:** Select a Plane (XY, YZ, ZX) → Draw Entities (Line, Arc, Circle, Rectangle) → Close the loop.
* **System Logic:**
  * **Validate Closure:** The kernel must detect if end-points match (Coincident constraint).
  * **Planar check:** Ensure all points lie on the local plane.
    
* **Code Output (Example):**
```typescript
const profile = sketch(Plane.XY)
  .lineTo(0, 10)
  .lineTo(10, 10)
  .lineTo(10, 0)
  .close();
```

## 2. The "Constraint-Solve" Workflow

*Definition:* Applying rules to 2D geometry so it behaves predictably during edits.

* **User Action:** Select two entities → Apply Constraint (e.g., Select Line A and Line B → Click "Parallel").
* **System Logic:**
  * **Solver Loop:** The solver (like Solver2D) runs to satisfy constraints.
  * **Over-constraint Check:** If the user sets a length to 10mm but also constrains it to a fixed point 5mm away, the system must flag an error (red highlights).

* **Primitive Constraints needed:**
  * *Coincident* (Point A = Point B)
  * *Horizontal/Vertical* (Line slope = 0 or infinity)
  * *Distance/Dimension* (Length = X)

## 3. The "Extrude-Solid" Workflow (The Hello World of CAD)

*Definition:* Pushing a 2D profile along a vector to create 3D volume (B-Rep).

* **User Action:** Select Sketch Profile → Input `Distance` value → Generate Solid.
* **System Logic:**
  * **Face Generation:** Create side faces connecting the profile edges.
  * **Cap Generation:** Create top/bottom faces.
  * **Sewing:** Stitch faces into a "Watertight" Shell.

* **Code Output:**
```typescript
const body = extrude(profile, { distance: 25 });
```

## 4. The "Boolean" Workflow (CSG)

*Definition:* Combining two solid bodies using set operations.

* **User Action:** Select "Target Body" (Main) → Select "Tool Body" (Cutter) → Select Operation (Cut/Join/Intersect).
* **System Logic:**
  * *Difference (Cut):* Subtract volume of B from A.
  * *Union (Join):* Merge volumes.
  * *Intersection:* Keep only overlapping volume.

* **Crucial for MVP:** This is how holes are made. A "Hole" is just a cylinder *subtracted* from a box.

## 5. The "Parametric Edit" Workflow (The Killer Feature)

*Definition:* Changing a value early in history and propagating it to the end result.

* **User Action:** Change `width = 10` to `width = 15` in the code/variable list.
* **System Logic (Dependency Graph):**
  * Identify all downstream features dependent on `width`.
  * **Re-execute** the history chain: `Sketch` (update coords) → `Extrude` (update faces) → `Fillet` (find new edges) → `Render`.
  * *Failure Mode:* If a fillet edge disappears because the width is too small, the system catches the error and displays a "Broken Feature" state (often yellow/red in UI).

## Summary Table

| Workflow | Input | Operation | Output |
| --- | --- | --- | --- |
| **Sketching** | Mouse Clicks / Points | `drawLine`, `drawArc` | 2D Wireframe |
| **Constraining** | 2 Entities | `solve(constraints)` | Rigid 2D Sketch |
| **Lofting/Extruding** | Closed Sketch | `makePrism` | 3D Solid (B-Rep) |
| **Filleting** | Edge Selection + Radius | `makeFillet` | Modified Solid |
| **Exporting** | Solid Body | `toSTEP()` / `toSTL()` | Downloadable File |

## 6. The "Stable Reference" Workflow (Datum Planes)

*Definition:* Managing geometric references to prevent the "Topological Naming Problem".

**The Problem:**
When you sketch directly on a face (e.g., "Face 12"), and then modify the model (e.g., add a fillet), "Face 12" might change ID or disappear. Your sketch breaks.

**The Solution: Datum Planes**
A **Datum Plane** is an infinite construction plane captured at a specific point in time. It doesn't change when the model geometry changes.

* **User Action:** Select Face → Click "Create Datum Plane" → Sketch on the new Plane.
* **System Logic:**
  * Capture the Origin and Normal of the selected face *right now*.
  * Create a `new Plane(...)` in code.
  * Attach the Sketch to this stable Plane object, not the volatile Face ID.
  
* **Code Output:**
```typescript
// 1. Capture the plane (Stable Reference)
const plane_face12 = new replicad.Plane([...origin], null, [...normal]);

// 2. Modify the shape (Face IDs change, but plane_face12 is safe)
const filleted = shape.fillet(2);

// 3. Sketch on the stable plane
const sketch = new Sketcher(plane_face12)...
```
