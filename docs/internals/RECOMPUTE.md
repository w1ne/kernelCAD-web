> **Ported from `kernelCAD-private` research; revised for v0.1+ implementation.**
> See `docs/superpowers/specs/2026-04-29-kernelcad-NORTHSTAR.md` for current architecture.

# kernelCAD High-Performance Compute Engine

This document details the internal evaluation loop and multithreading strategy for the kernelCAD recompute engine.

## 1. The Core Compute Loop (Pseudocode)

The engine must operate as a "Demand-Driven" system.

```cpp
void RelationshipGraph::recomputeAll() {
    // 1. Identification
    auto dirtyNodes = findDirtyNodes();
    
    // 2. Topological Sort
    // Ensures parents are computed before children
    auto sortedList = topologicalSort(dirtyNodes);
    
    for (auto& node : sortedList) {
        // 3. Evaluation Context
        ComputeContext ctx = getContextFor(node);
        
        // 4. SMI Invocation
        // SMI classes batch kernel calls and update the B-Rep cache
        bool success = node->smiOperator()->execute(ctx);
        
        if (!success) {
            markSubtreeAsError(node);
            continue;
        }
        
        // 5. Attribute Propagation
        // Carry StableIDs from inputs to outputs
        propagateAttributes(node);
        
        node->setDirty(false);
    }
}
```

---

## 2. Multithreaded SMI Workflow

To achieve "High-Performance", kernelCAD parallelizes at the **Component level**.

### Job System Architecture
- **Worker Threads**: N threads (one per CPU core).
- **Dependency Sharding**: `Occurrence` nodes that move independently can have their transforms updated in parallel.
- **Tessellation Parallelism**: Once a feature produces a `BRepBody`, the triangulation (for GPU rendering) is offloaded to a background thread immediately, even while the next feature is computing.

---

## 3. Memory Management: The "Arena" Strategy

High-performance CAD tools generate millions of transient B-Rep objects during a recompute.

- **Arena Allocator**: Use a memory arena per `Transaction`. At the end of the recompute, the entire arena is purged, avoiding thousands of individual `delete` calls and memory fragmentation.
- **Persistency**: Only the "Final" result of a feature is copied out of the arena into the long-term `Component` storage.

## 4. Viewport Synchronization (The "Ghost" Preview)

To prevent UI lag during complex modeling:
1. **Preview Thread**: Commands run a "Lightweight" SMI operator on a separate thread to show a ghosted preview.
2. **Transaction Commit**: Only when the user clicks "OK", the full `RelationshipGraph` is updated and the "Core Compute Loop" is triggered globally.
