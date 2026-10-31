// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/occtFinalizers.ts
//
// GC safety net for OCCT objects constructed from JavaScript.
//
// Embind frees a C++ object only on an explicit `.delete()`; it attaches GC
// finalizers to smart-pointer handles alone. Code that constructs an OCCT
// object and drops it without deleting it leaks it for the life of the WASM
// module, and WASM memory never shrinks. replicad does this in several hot
// paths: `makeLine` and the curve-to-edge helpers construct a
// `BRepBuilderAPI_MakeEdge` (which holds the edge it built) and the `gp_Pnt`s
// they pass to it, and never delete either. A 20,000-box loop grew the heap
// from 73 MB to 217 MB that way.
//
// So every `new oc.X(...)` is registered with a FinalizationRegistry that
// releases the object if its handle becomes unreachable while still alive,
// exactly as an explicit `.delete()` would (same reference count, same
// destructor). An object deleted explicitly has a null pointer by then and is
// skipped. Constructed objects are owned by JavaScript, with one exception:
// a Standard_Transient (reference counted) may be adopted by an OCCT handle,
// e.g. `new Handle_XSControl_WorkSession_2(new XSControl_WorkSession())`, and
// the handle frees it. Those are never registered.
//
// Returned handles are covered only for value types OCCT returns by copy
// (shapes, gp_* geometry, locations, boxes): replicad drops those too, e.g.
// `downcast(builder.Shape())` leaves the builder's `TopoDS_Shape` handle, which
// keeps the whole solid alive, and every `Vector.toPnt()` leaves a `gp_XYZ`.
// Other returned handles can be raw pointers a C++ owner still holds, so they
// are left alone. replicad's own registry holds each handle it wraps strongly
// until its wrapper is collected and deleted, so this never frees a handle
// replicad still owns.

/** Embind's per-handle record (`handle.$$`), the fields `runDestructor` reads. */
interface EmbindHandleRecord {
  ptr?: number;
  smartPtr?: number;
  deleteScheduled?: boolean;
  count: { value: number };
  ptrType: { registeredClass: { rawDestructor: (ptr: number) => void } };
  smartPtrType?: { rawDestructor: (ptr: number) => void };
}

const INSTALLED = Symbol.for('kernelcad.occtFinalizers');

let released = 0;

/** Objects freed by the safety net so far (diagnostics and tests). */
export function finalizedOcctObjectCount(): number {
  return released;
}

function release(record: EmbindHandleRecord): void {
  if (!record.ptr || record.deleteScheduled) return;
  record.count.value -= 1;
  if (record.count.value !== 0) return;
  released += 1;
  try {
    if (record.smartPtr && record.smartPtrType) record.smartPtrType.rawDestructor(record.smartPtr);
    else record.ptrType.registeredClass.rawDestructor(record.ptr);
  } catch {
    // A finalizer must never throw into the event loop; a poisoned heap is
    // reported by the next real kernel call.
  }
}

/** Classes OCCT only ever returns by value (a copy JavaScript owns). */
const RETURNED_VALUE_CLASS = /^(TopoDS_(Shape|Vertex|Edge|Wire|Face|Shell|Solid|CompSolid|Compound)|gp_[A-Za-z0-9]+|TopLoc_Location|Bnd_Box2d|Bnd_Box)(_\d+)?$/;

function className(handle: { $$?: { ptrType?: { registeredClass?: { name?: string } } } }): string | undefined {
  return handle.$$?.ptrType?.registeredClass?.name;
}

/** Standard_Transient subclasses inherit its reference-count methods. */
function isTransientClass(ctor: unknown): boolean {
  const proto = (ctor as { prototype?: { DecrementRefCounter?: unknown } }).prototype;
  return typeof proto?.DecrementRefCounter === 'function';
}

function isEmbindClass(value: unknown): value is new (...args: unknown[]) => object {
  if (typeof value !== 'function') return false;
  const proto = (value as { prototype?: { delete?: unknown; isDeleted?: unknown } }).prototype;
  return typeof proto?.delete === 'function' && typeof proto.isDeleted === 'function';
}

const HANDLE_METHODS = new Set(['constructor', 'delete', 'isDeleted', 'clone', 'deleteLater', 'isAliasOf']);

/** Route every method's return value through `track`, once per object. */
function wrapReturns(target: Record<string, unknown>, done: Set<object>, track: (v: unknown) => unknown): void {
  if (done.has(target)) return;
  done.add(target);
  for (const name of Object.getOwnPropertyNames(target)) {
    if (HANDLE_METHODS.has(name) || name === 'prototype' || name === 'length' || name === 'name') continue;
    const desc = Object.getOwnPropertyDescriptor(target, name);
    if (!desc || typeof desc.value !== 'function' || !desc.writable) continue;
    const fn = desc.value as (...args: unknown[]) => unknown;
    target[name] = function (this: unknown, ...args: unknown[]) {
      return track(fn.apply(this, args));
    };
  }
}

/** Make `.delete()` drop the handle's registration. Embind classes inherit
 *  `delete` from one shared ClassHandle prototype; patch the prototype that
 *  owns it, once. */
function patchDelete(proto: object, done: Set<object>, registry: FinalizationRegistry<EmbindHandleRecord>): void {
  let owner: object | null = proto;
  while (owner && !Object.prototype.hasOwnProperty.call(owner, 'delete')) owner = Object.getPrototypeOf(owner);
  if (!owner || done.has(owner)) return;
  done.add(owner);
  const target = owner as { delete: (this: object) => unknown };
  const original = target.delete;
  target.delete = function (this: object) {
    registry.unregister(this);
    return original.call(this);
  };
}

/**
 * Wrap every embind class constructor on `oc` so constructed objects are
 * freed by GC when nobody deletes them. Idempotent per module instance.
 */
export function installOcctFinalizers(oc: Record<string | symbol, unknown>): void {
  if (oc[INSTALLED] || typeof FinalizationRegistry === 'undefined') return;
  const registry = new FinalizationRegistry<EmbindHandleRecord>(release);
  // The handle is its own unregister token, so an explicit `.delete()` drops
  // the registration at once. Without that every deleted object kept a
  // WeakCell, its held record and that record's counter until GC collected
  // the wrapper AND the registry's cleanup task ran — on a long modelling run
  // that was hundreds of thousands of entries (~80 MB of JS heap).
  const register = (handle: object, record: EmbindHandleRecord): void => {
    registry.register(handle, record, handle);
  };
  const track = (value: unknown): unknown => {
    const handle = value as { $$?: EmbindHandleRecord } | null;
    if (handle !== null && typeof handle === 'object' && handle.$$?.ptr) {
      const name = className(handle as never);
      if (name !== undefined && RETURNED_VALUE_CLASS.test(name)) register(handle, handle.$$);
    }
    return value;
  };
  const unregisterOnDelete = new Set<object>();
  const wrapped = new Set<object>();
  for (const key of Object.keys(oc)) {
    const ctor = oc[key];
    if (!isEmbindClass(ctor)) continue;
    wrapReturns(ctor.prototype as Record<string, unknown>, wrapped, track);
    wrapReturns(ctor as unknown as Record<string, unknown>, wrapped, track);
    patchDelete(ctor.prototype as object, unregisterOnDelete, registry);
    if (isTransientClass(ctor)) continue;
    oc[key] = new Proxy(ctor, {
      construct(target, args, newTarget) {
        const handle = Reflect.construct(target, args, newTarget) as { $$?: EmbindHandleRecord };
        if (handle.$$) register(handle, handle.$$);
        return handle;
      },
    });
  }
  oc[INSTALLED] = true;
}
