//! In-process Parasolid transmit reader.
//!
//! The parser is parasolid-core. This crate only exposes one wasm entry point
//! that kernelCAD calls directly. It does not spawn a program.

use std::cell::UnsafeCell;
use std::collections::{BTreeSet, HashMap};

mod provider;
pub mod placement;
pub mod stream;

use parasolid_core::brep::{
    map_xb_brep, BrepId, BrepModel, CurveGeometry, CurveKind, Edge, Face, HalfEdge, Loop,
    PointGeometry, Region, Sense, Shell, SurfaceKind, SurfaceGeometry, Vertex,
};
use parasolid_core::{
    BuiltinProfileRegistry, DocumentLimits, InspectionLimits, SchemaKey, XtDocument, inspect_xb,
    parse_xb,
};
use serde_json::{json, Value};

struct ResultSlot(UnsafeCell<Vec<u8>>);
// The wasm module is called from one JS thread. The slot is only touched
// inside `read_parasolid` and `result_ptr`, and the caller copies the bytes
// before the next read.
unsafe impl Sync for ResultSlot {}
static RESULT: ResultSlot = ResultSlot(UnsafeCell::new(Vec::new()));

/// Last panic message, readable from JS after catching the wasm trap so a
/// `panic = "abort"` build still explains what failed.
struct PanicSlot(UnsafeCell<Vec<u8>>);
unsafe impl Sync for PanicSlot {}
static PANIC: PanicSlot = PanicSlot(UnsafeCell::new(Vec::new()));

#[no_mangle]
pub extern "C" fn panic_ptr() -> *const u8 {
    unsafe { (*PANIC.0.get()).as_ptr() }
}

#[no_mangle]
pub extern "C" fn panic_len() -> u32 {
    unsafe { (*PANIC.0.get()).len() as u32 }
}

fn install_panic_hook() {
    use std::sync::Once;
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        std::panic::set_hook(Box::new(|info| {
            let message = format!("{info}");
            unsafe {
                *PANIC.0.get() = message.into_bytes();
            }
        }));
    });
}

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

/// Read a Parasolid transmit buffer, taking ownership of the allocation made
/// by `alloc`. Returns the byte length of the JSON result. The bytes live at
/// `result_ptr` until the next call.
#[no_mangle]
pub extern "C" fn read_parasolid(ptr: *const u8, len: u32) -> u32 {
    install_panic_hook();
    let input: Vec<u8> = if ptr.is_null() || len == 0 {
        Vec::new()
    } else {
        // The only allocation this pointer can name is one made by `alloc`,
        // whose capacity equals its length.
        unsafe { Vec::from_raw_parts(ptr as *mut u8, len as usize, len as usize) }
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

fn read_transmit(input: Vec<u8>) -> String {
    if is_text_transmit(&input) {
        read_transmit_text(input)
    } else {
        read_transmit_binary(&input)
    }
}

/// Text transmits are streamed: compact the buffer, summarize the pointer
/// graph, then map each body's small closure separately. The full document is
/// never retained, which is what keeps whole-machine files inside the
/// webassembly address space.
fn read_transmit_text(input: Vec<u8>) -> String {
    let limits = limits_for(input.len());
    let payload = match parasolid_core::compact_xt_owned(input, limits.inspection_limits()) {
        Ok(payload) => payload,
        Err(error) => return fail(&error.to_string(), error.kind().code(), None),
    };
    let schema_key = payload.header().schema_key.clone();
    let key = match SchemaKey::parse(&schema_key) {
        Ok(key) => key,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let registry = match BuiltinProfileRegistry::compiled() {
        Ok(registry) => registry,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let export = if let Some(provider) = registry.provider_for_key(&key) {
        match stream::stream_export(&payload, &provider, limits) {
            Ok(export) => export,
            Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
        }
    } else if key.provider_schema() == "13006" {
        let provider = provider::for_key(&key);
        match stream::stream_export(&payload, &provider, limits) {
            Ok(export) => export,
            Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
        }
    } else {
        return fail(
            "no built-in profile supports this exact schema key",
            "schema.missing_base_schema",
            Some(&schema_key),
        );
    };
    drop(payload);
    streamed_json(&export)
}

fn streamed_json(export: &stream::StreamedExport) -> String {
    let mut placed = BTreeSet::<usize>::new();
    for instance in &export.instances {
        if let Some(ordinal) = instance.get("body").and_then(Value::as_u64) {
            placed.insert(ordinal as usize);
        }
    }
    let mut out = String::with_capacity(export.bodies_json.len().saturating_add(4096));
    out.push_str("{\"ok\":true,\"schemaKey\":");
    out.push_str(&Value::String(export.schema_key.clone()).to_string());
    out.push_str(",\"complete\":");
    out.push_str(if export.skipped_bodies == 0 { "true" } else { "false" });
    out.push_str(",\"bodyCount\":");
    out.push_str(&export.body_count.to_string());
    out.push_str(",\"mappedBodies\":");
    out.push_str(&export.mapped_bodies.to_string());
    out.push_str(",\"skippedBodies\":");
    out.push_str(&export.skipped_bodies.to_string());
    out.push_str(",\"firstSkip\":");
    out.push_str(&match &export.first_skip {
        Some(message) => Value::String(message.clone()).to_string(),
        None => "null".to_owned(),
    });
    out.push_str(",\"unplacedBodies\":");
    out.push_str(&(export.body_count - placed.len()).to_string());
    out.push_str(",\"bodies\":");
    // The body array was serialized body by body during mapping.
    out.push_str(&String::from_utf8_lossy(&export.bodies_json));
    out.push_str(",\"instances\":");
    out.push_str(&Value::Array(export.instances.clone()).to_string());
    out.push('}');
    out
}

/// Binary transmits are small enough to retain; keep the original path.
fn read_transmit_binary(bytes: &[u8]) -> String {
    let limits = limits_for(bytes.len());
    let schema_key = match inspect_xb(bytes, limits.inspection_limits()) {
        Ok(header) => header.schema_key,
        Err(error) => return fail(&error.to_string(), error.kind().code(), None),
    };
    let key = match SchemaKey::parse(&schema_key) {
        Ok(key) => key,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let registry = match BuiltinProfileRegistry::compiled() {
        Ok(registry) => registry,
        Err(error) => return fail(&error.to_string(), error.kind().code(), Some(&schema_key)),
    };
    let (model, document): (BrepModel, Option<XtDocument>) =
        if let Some(provider) = registry.provider_for_key(&key) {
            match map_binary(bytes, &provider, limits) {
                Ok(result) => result,
                Err(error) => {
                    return fail(&error.to_string(), error.kind().code(), Some(&schema_key))
                }
            }
        } else if key.provider_schema() == "13006" {
            let provider = provider::for_key(&key);
            match map_binary(bytes, &provider, limits) {
                Ok(result) => result,
                Err(error) => {
                    return fail(&error.to_string(), error.kind().code(), Some(&schema_key))
                }
            }
        } else {
            return fail(
                "no built-in profile supports this exact schema key",
                "schema.missing_base_schema",
                Some(&schema_key),
            );
        };
    let placements = document
        .as_ref()
        .map(|document| placement::placements(document, None))
        .unwrap_or_default();
    drop(document);
    model_json(&model, &placements)
}

fn map_binary(
    bytes: &[u8],
    provider: &impl parasolid_core::SchemaProvider,
    limits: DocumentLimits,
) -> Result<(BrepModel, Option<XtDocument>), parasolid_core::ParseError> {
    let document = parse_xb(bytes, provider, limits)?;
    let model = map_xb_brep(&document)?;
    Ok((model, None))
}

fn limits_for(len: usize) -> DocumentLimits {
    DocumentLimits {
        max_file_size: len.max(1),
        max_nodes: 50_000_000,
        max_variable_elements: 50_000_000,
        retain_raw_bytes: false,
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
            retain_source_offsets: self.retain_raw_bytes,
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

/// Lookup tables over one mapped B-Rep model.
struct ModelMaps<'a> {
    points: HashMap<BrepId, &'a PointGeometry>,
    vertices: HashMap<BrepId, &'a Vertex>,
    half_edges: HashMap<BrepId, &'a HalfEdge>,
    loops: HashMap<BrepId, &'a Loop>,
    faces: HashMap<BrepId, &'a Face>,
    regions: HashMap<BrepId, &'a Region>,
    shells: HashMap<BrepId, &'a Shell>,
    edges: HashMap<BrepId, &'a Edge>,
    curves: HashMap<BrepId, &'a CurveGeometry>,
    surfaces: HashMap<BrepId, &'a SurfaceGeometry>,
}

impl<'a> ModelMaps<'a> {
    fn build(model: &'a BrepModel) -> Self {
        Self {
            points: model.points.iter().map(|point| (point.id, point)).collect(),
            vertices: model.vertices.iter().map(|vertex| (vertex.id, vertex)).collect(),
            half_edges: model.half_edges.iter().map(|fin| (fin.id, fin)).collect(),
            loops: model.loops.iter().map(|loop_| (loop_.id, loop_)).collect(),
            faces: model.faces.iter().map(|face| (face.id, face)).collect(),
            regions: model.regions.iter().map(|region| (region.id, region)).collect(),
            shells: model.shells.iter().map(|shell| (shell.id, shell)).collect(),
            edges: model.edges.iter().map(|edge| (edge.id, edge)).collect(),
            curves: model.curves.iter().map(|curve| (curve.id, curve)).collect(),
            surfaces: model.surfaces.iter().map(|surface| (surface.id, surface)).collect(),
        }
    }

    fn faces_of(&self, body: &parasolid_core::brep::Body) -> Vec<Value> {
        let seen = &mut BTreeSet::<BrepId>::new();
        let mut out_faces = Vec::<Value>::new();
        for region_id in &body.regions {
            let Some(region) = self.regions.get(region_id) else { continue };
            for shell_id in &region.shells {
                let Some(shell) = self.shells.get(shell_id) else { continue };
                for face_id in shell.back_faces.iter().chain(shell.front_faces.iter()) {
                    if !seen.insert(*face_id) {
                        continue;
                    }
                    let Some(face) = self.faces.get(face_id) else { continue };
                    out_faces.push(face_json(
                        face,
                        &self.loops,
                        &self.half_edges,
                        &self.vertices,
                        &self.points,
                        &self.edges,
                        &self.curves,
                        &self.surfaces,
                    ));
                }
            }
        }
        out_faces
    }
}

/// Faces of one mapped body, in shell order; `None` when the body node is
/// absent from the model.
pub(crate) fn body_faces_json(model: &BrepModel, body_node_index: u32) -> Option<Vec<Value>> {
    let body = model
        .bodies
        .iter()
        .find(|body| body.source.node_index == body_node_index)?;
    Some(ModelMaps::build(model).faces_of(body))
}

/// The empty face list used for bodies that could not be mapped.
pub(crate) fn no_faces_json() -> Vec<Value> {
    Vec::new()
}

fn model_json(model: &BrepModel, placements: &[placement::BodyPlacement]) -> String {
    let maps = ModelMaps::build(model);
    let mut bodies = Vec::<Value>::new();
    let mut ordinal_of_node = HashMap::<u32, usize>::new();
    for (ordinal, body) in model.bodies.iter().enumerate() {
        ordinal_of_node.insert(body.source.node_index, ordinal);
        bodies.push(json!({ "faces": maps.faces_of(body) }));
    }
    let mut instances = Vec::<Value>::new();
    let mut placed = BTreeSet::<usize>::new();
    for placement in placements {
        let Some(ordinal) = ordinal_of_node.get(&placement.body) else { continue };
        placed.insert(*ordinal);
        instances.push(json!({
            "body": ordinal,
            "rotation": placement.transform.rotation,
            "translation": placement.transform.translation,
            "scale": placement.transform.scale,
        }));
    }
    json!({
        "ok": true,
        "schemaKey": model.schema_key,
        "complete": model.complete,
        "bodyCount": model.bodies.len(),
        "unplacedBodies": model.bodies.len() - placed.len(),
        "bodies": bodies,
        "instances": instances,
    })
    .to_string()
}

fn face_json(
    face: &Face,
    loops: &HashMap<BrepId, &Loop>,
    half_edges: &HashMap<BrepId, &HalfEdge>,
    vertices: &HashMap<BrepId, &Vertex>,
    points: &HashMap<BrepId, &PointGeometry>,
    edges: &HashMap<BrepId, &Edge>,
    curves: &HashMap<BrepId, &CurveGeometry>,
    surfaces: &HashMap<BrepId, &SurfaceGeometry>,
) -> Value {
    let surface = face.surface.and_then(|id| surfaces.get(&id).map(|s| *s));
    let kind = surface.map(|s| s.kind.as_str()).unwrap_or("missing");
    let surf = surface.map(|s| surface_params(&s.kind)).unwrap_or(Value::Null);
    let position = |vertex_id: Option<BrepId>| -> Option<Value> {
        let vertex = vertices.get(&vertex_id?)?;
        let point = points.get(&vertex.point)?;
        Some(xyz(&point.position))
    };
    let mut rings = Vec::<Value>::new();
    let mut exact = Vec::<Value>::new();
    for loop_id in &face.loops {
        let Some(loop_) = loops.get(loop_id) else { continue };
        let mut ring = Vec::<Value>::new();
        let mut segments = Vec::<Value>::new();
        let mut all_exact = true;
        for fin_id in &loop_.half_edges {
            let Some(fin) = half_edges.get(fin_id) else { continue };
            if fin.dummy {
                continue;
            }
            if let Some(position) = position(fin.vertex) {
                ring.push(position);
            }
            match fin_segment(fin, edges, curves, &position) {
                Some(segment) => segments.push(segment),
                None => all_exact = false,
            }
        }
        if ring.len() >= 3 {
            rings.push(Value::Array(ring));
        }
        if all_exact && !segments.is_empty() {
            exact.push(Value::Array(segments));
        }
    }
    json!({ "kind": kind, "loops": rings, "edges": exact, "surf": surf })
}

/// One exact loop segment: the curve and the fin's traversal endpoints.
fn fin_segment(
    fin: &HalfEdge,
    edges: &HashMap<BrepId, &Edge>,
    curves: &HashMap<BrepId, &CurveGeometry>,
    position: &impl Fn(Option<BrepId>) -> Option<Value>,
) -> Option<Value> {
    let edge = fin.edge.and_then(|id| edges.get(&id))?;
    let curve = edge.curve.and_then(|id| curves.get(&id))?;
    let (mut start_vertex, mut end_vertex) = (edge.start_vertex, edge.end_vertex);
    if fin.sense == Sense::Negative {
        std::mem::swap(&mut start_vertex, &mut end_vertex);
    }
    let mut start = position(start_vertex);
    let mut end = position(end_vertex);
    let curve_json = curve_json(&curve.kind, curves)?;
    if let CurveKind::Trimmed {
        start_point,
        end_point,
        ..
    } = &curve.kind
    {
        start = Some(xyz(start_point));
        end = Some(xyz(end_point));
        if fin.sense == Sense::Negative {
            std::mem::swap(&mut start, &mut end);
        }
    }
    Some(json!({
        "curve": curve_json,
        "start": start,
        "end": end,
        "sense": match fin.sense {
            Sense::Positive => "+",
            Sense::Negative => "-",
            Sense::Unknown => "?",
        },
    }))
}

fn curve_json(kind: &CurveKind, curves: &HashMap<BrepId, &CurveGeometry>) -> Option<Value> {
    Some(match kind {
        CurveKind::Line { point, direction } => json!({
            "kind": "line", "point": xyz(point), "direction": xyz(direction)
        }),
        CurveKind::Circle {
            center,
            normal,
            x_axis,
            radius,
        } => json!({
            "kind": "circle", "center": xyz(center), "normal": xyz(normal),
            "xAxis": xyz(x_axis), "radius": radius
        }),
        CurveKind::Ellipse {
            center,
            normal,
            x_axis,
            major_radius,
            minor_radius,
        } => json!({
            "kind": "ellipse", "center": xyz(center), "normal": xyz(normal),
            "xAxis": xyz(x_axis), "major": major_radius, "minor": minor_radius
        }),
        CurveKind::Trimmed { basis_curve, .. } => {
            let basis = curves.get(basis_curve)?;
            curve_json(&basis.kind, curves)?
        }
        _ => return None,
    })
}

fn xyz(v: &parasolid_core::brep::Vector3) -> Value {
    json!([v.x, v.y, v.z])
}

fn surface_params(kind: &SurfaceKind) -> Value {
    match kind {
        SurfaceKind::Plane { point, normal, x_axis } => json!({
            "point": xyz(point), "normal": xyz(normal), "xAxis": xyz(x_axis)
        }),
        SurfaceKind::Cylinder { point, axis, radius, x_axis } => json!({
            "point": xyz(point), "axis": xyz(axis), "radius": radius, "xAxis": xyz(x_axis)
        }),
        SurfaceKind::Cone { point, axis, radius, sin_half_angle, cos_half_angle, x_axis } => json!({
            "point": xyz(point), "axis": xyz(axis), "radius": radius,
            "sinHalf": sin_half_angle, "cosHalf": cos_half_angle, "xAxis": xyz(x_axis)
        }),
        SurfaceKind::Sphere { center, radius, axis, x_axis } => json!({
            "center": xyz(center), "radius": radius, "axis": xyz(axis), "xAxis": xyz(x_axis)
        }),
        SurfaceKind::Torus { center, axis, major_radius, minor_radius, x_axis } => json!({
            "center": xyz(center), "axis": xyz(axis),
            "major": major_radius, "minor": minor_radius, "xAxis": xyz(x_axis)
        }),
        _ => Value::Null,
    }
}
