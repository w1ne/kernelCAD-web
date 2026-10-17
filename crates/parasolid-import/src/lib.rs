//! In-process Parasolid transmit reader.
//!
//! The parser is parasolid-core. This crate only exposes one wasm entry point
//! that kernelCAD calls directly. It does not spawn a program.

use std::cell::UnsafeCell;
use std::collections::HashMap;

use parasolid_core::brep::{
    map_xb_brep, map_xt_brep, BrepId, BrepModel, Face, HalfEdge, Loop, PointGeometry,
    SurfaceGeometry, Vertex,
};
use parasolid_core::{
    BuiltinProfileRegistry, DocumentLimits, InspectionLimits, SchemaKey, inspect_xb, inspect_xt,
    parse_xb, parse_xt,
};
use serde_json::{json, Value};

struct ResultSlot(UnsafeCell<Vec<u8>>);
// The wasm module is called from one JS thread. The slot is only touched
// inside `read_parasolid` and `result_ptr`, and the caller copies the bytes
// before the next read.
unsafe impl Sync for ResultSlot {}
static RESULT: ResultSlot = ResultSlot(UnsafeCell::new(Vec::new()));

#[no_mangle]
pub extern "C" fn alloc(len: u32) -> *mut u8 {
    let mut bytes = Vec::<u8>::with_capacity(len as usize);
    bytes.resize(len as usize, 0);
    let ptr = bytes.as_mut_ptr();
    std::mem::forget(bytes);
    ptr
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: u32) {
    if ptr.is_null() || len == 0 {
        return;
    }
    // The allocation from `alloc` has capacity == length.
    unsafe {
        drop(Vec::from_raw_parts(ptr, len as usize, len as usize));
    }
}

/// Read a Parasolid transmit buffer. Returns the byte length of the JSON
/// result. The bytes live at `result_ptr` until the next call.
#[no_mangle]
pub extern "C" fn read_parasolid(ptr: *const u8, len: u32) -> u32 {
    let input = if ptr.is_null() || len == 0 {
        &[][..]
    } else {
        unsafe { std::slice::from_raw_parts(ptr, len as usize) }
    };
    let json = read_transmit(input);
    let bytes = json.into_bytes();
    let n = bytes.len() as u32;
    unsafe {
        *RESULT.0.get() = bytes;
    }
    n
}

#[no_mangle]
pub extern "C" fn result_ptr() -> *const u8 {
    unsafe { (*RESULT.0.get()).as_ptr() }
}

fn read_transmit(bytes: &[u8]) -> String {
    let limits = limits_for(bytes.len());
    let text = is_text_transmit(bytes);
    let schema_key = if text {
        match inspect_xt(bytes, limits.inspection_limits()) {
            Ok(header) => header.schema_key,
            Err(error) => return fail(&error.to_string(), error.kind().code(), None),
        }
    } else {
        match inspect_xb(bytes, limits.inspection_limits()) {
            Ok(header) => header.schema_key,
            Err(error) => return fail(&error.to_string(), error.kind().code(), None),
        }
    };
    let key = match SchemaKey::parse(&schema_key) {
        Ok(key) => key,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let registry = match BuiltinProfileRegistry::compiled() {
        Ok(registry) => registry,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let Some(provider) = registry.provider_for_key(&key) else {
        return fail(
            "no built-in profile supports this exact schema key",
            "schema.missing_base_schema",
            Some(&schema_key),
        );
    };
    let model = if text {
        match parse_xt(bytes, &provider, limits) {
            Ok(document) => match map_xt_brep(&document) {
                Ok(model) => model,
                Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
            },
            Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
        }
    } else {
        match parse_xb(bytes, &provider, limits) {
            Ok(document) => match map_xb_brep(&document) {
                Ok(model) => model,
                Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
            },
            Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
        }
    };
    model_json(&model)
}

fn limits_for(len: usize) -> DocumentLimits {
    DocumentLimits {
        max_file_size: len.max(1),
        ..DocumentLimits::default()
    }
}

trait InspectionFromDocument {
    fn inspection_limits(self) -> InspectionLimits;
}

impl InspectionFromDocument for DocumentLimits {
    fn inspection_limits(self) -> InspectionLimits {
        InspectionLimits {
            max_file_size: self.max_file_size,
            max_string_bytes: self.max_string_bytes,
        }
    }
}

fn is_text_transmit(bytes: &[u8]) -> bool {
    bytes.starts_with(b"**") || bytes.starts_with(b"T")
}

fn fail(message: &str, code: &str, schema_key: Option<&str>) -> String {
    json!({
        "ok": false,
        "code": code,
        "schemaKey": schema_key,
        "message": message,
    })
    .to_string()
}

fn model_json(model: &BrepModel) -> String {
    let points: HashMap<BrepId, &PointGeometry> = model.points.iter().map(|point| (point.id, point)).collect();
    let vertices: HashMap<BrepId, &Vertex> = model.vertices.iter().map(|vertex| (vertex.id, vertex)).collect();
    let half_edges: HashMap<BrepId, &HalfEdge> = model.half_edges.iter().map(|fin| (fin.id, fin)).collect();
    let loops: HashMap<BrepId, &Loop> = model.loops.iter().map(|loop_| (loop_.id, loop_)).collect();
    let faces: HashMap<BrepId, &Face> = model.faces.iter().map(|face| (face.id, face)).collect();
    let surfaces: HashMap<BrepId, &SurfaceGeometry> = model.surfaces.iter().map(|surface| (surface.id, surface)).collect();
    let mut seen = HashMap::<BrepId, ()>::new();
    let mut out_faces = Vec::<Value>::new();
    for shell in &model.shells {
        for face_id in shell.back_faces.iter().chain(shell.front_faces.iter()) {
            if seen.insert(*face_id, ()).is_some() {
                continue;
            }
            let Some(face) = faces.get(face_id) else { continue };
            out_faces.push(face_json(face, &loops, &half_edges, &vertices, &points, &surfaces));
        }
    }
    json!({
        "ok": true,
        "schemaKey": model.schema_key,
        "complete": model.complete,
        "bodyCount": model.bodies.len(),
        "faces": out_faces,
    })
    .to_string()
}

fn face_json(
    face: &Face,
    loops: &HashMap<BrepId, &Loop>,
    half_edges: &HashMap<BrepId, &HalfEdge>,
    vertices: &HashMap<BrepId, &Vertex>,
    points: &HashMap<BrepId, &PointGeometry>,
    surfaces: &HashMap<BrepId, &SurfaceGeometry>,
) -> Value {
    let kind = face
        .surface
        .and_then(|id| surfaces.get(&id))
        .map(|surface| surface.kind.as_str())
        .unwrap_or("missing");
    let mut rings = Vec::<Value>::new();
    for loop_id in &face.loops {
        let Some(loop_) = loops.get(loop_id) else { continue };
        let mut ring = Vec::<Value>::new();
        for fin_id in &loop_.half_edges {
            let Some(fin) = half_edges.get(fin_id) else { continue };
            if fin.dummy {
                continue;
            }
            let Some(vertex_id) = fin.vertex else { continue };
            let Some(vertex) = vertices.get(&vertex_id) else { continue };
            let Some(point) = points.get(&vertex.point) else { continue };
            ring.push(json!([point.position.x, point.position.y, point.position.z]));
        }
        if ring.len() >= 3 {
            rings.push(Value::Array(ring));
        }
    }
    json!({ "kind": kind, "loops": rings })
}
