use parasolid_core::{
    FieldDefinition, FieldType, InMemorySchemaProvider, SchemaKey, SchemaProvider, SchemaSource,
    TypeDefinition,
};
use serde_json::Value;

const CATALOG: &str = include_str!("sch13006-base.json");

pub fn for_key(key: &SchemaKey) -> InMemorySchemaProvider {
    let catalog: Vec<Value> = serde_json::from_str(CATALOG).expect("embedded 13006 catalog");
    let mut provider = InMemorySchemaProvider::new();
    provider.add_schema(key.provider_schema());
    for profile in [
        parasolid_core::schema::profiles::onshape_sch13006().expect("profile"),
        parasolid_core::schema::profiles::solidworks_sch37102_13006().expect("profile"),
        parasolid_core::schema::profiles::onshape_sch37102_13006().expect("profile"),
        parasolid_core::schema::profiles::icad_sch34101_13006().expect("profile"),
        parasolid_core::schema::profiles::icad_sch30000_13006().expect("profile"),
    ] {
        for definition in profile.definitions() {
            let replace = provider
                .type_definition(key.provider_schema(), definition.node_type)
                .is_none_or(|existing| existing.fields.len() < definition.fields.len());
            if replace {
                provider.insert(key.provider_schema(), definition.clone());
            }
        }
    }
    for entry in &catalog {
        let type_id = entry["type"].as_u64().expect("type") as u16;
        if provider.type_definition(key.provider_schema(), type_id).is_some() {
            continue;
        }
        let codes = entry["fields"].as_array().expect("fields");
        let mut fields = Vec::new();
        for (index, code) in codes.iter().enumerate() {
            fields.push(field_from_code(index, code.as_str().expect("code")));
        }
        if entry["variable"].as_bool() == Some(true) {
            let var_code = entry["var"].as_str().unwrap_or("f");
            let var_code = if var_code.is_empty() { "f" } else { var_code };
            if let Some(last) = fields.last_mut() {
                last.field_type = match var_code {
                    "d" => FieldType::Integer,
                    "u" => FieldType::UnsignedByte,
                    "n" => FieldType::ShortInteger,
                    "f" => FieldType::Double,
                    "c" => FieldType::Character,
                    "l" => FieldType::Logical,
                    "p" => FieldType::PointerIndex,
                    "v" => FieldType::Vector,
                    "i" => FieldType::Interval,
                    _ => FieldType::Double,
                };
                last.element_count = 1;
            } else {
                fields.push(field_from_code(0, var_code));
                fields[0].element_count = 1;
            }
        }
        tag_geometry_header(type_id, &mut fields);
        provider.insert(
            key.provider_schema(),
            TypeDefinition::from_fields(type_id, role_name(type_id), "", fields, SchemaSource::Base),
        );
    }
    for type_id in 2u16..300 {
        let Some(name) = role_name_known(type_id) else { continue };
        let Some(mut definition) = provider.type_definition(key.provider_schema(), type_id).cloned() else {
            continue;
        };
        definition.name = name.to_owned();
        alias_role_fields(&mut definition);
        provider.insert(key.provider_schema(), definition);
    }
    provider
}

fn tag_geometry_header(type_id: u16, fields: &mut [FieldDefinition]) {
    let surface = matches!(type_id, 50..=63 | 67..=69);
    let curve = matches!(type_id, 30..=39 | 46 | 48 | 133 | 134 | 137);
    if !surface && !curve || fields.len() < 7 {
        return;
    }
    let names = [
        "node_id",
        "annotations",
        "owner",
        "next",
        "previous",
        "geometric_owner",
        "sense",
    ];
    for (index, name) in names.iter().enumerate() {
        fields[index].name = (*name).to_owned();
    }
    fields[2].pointer_class = if surface { 1007 } else { 1010 };
    let chain = if surface { 1006 } else { 1008 };
    fields[3].pointer_class = chain;
    fields[4].pointer_class = chain;
    fields[5].pointer_class = 141;
}

fn alias_role_fields(definition: &mut TypeDefinition) {
    // parasolid-core's caller-supplied mapper looks up the role name, while the
    // reviewed 13006 profiles store the source field name. Copy keeps the base
    // name, so the base must already use the role name.
    let pairs: &[(&str, &str)] = match definition.node_type {
        12 => &[
            ("size_precision", "res_size"),
            ("linear_precision", "res_linear"),
            ("body_kind", "body_type"),
            ("region_head", "region"),
            ("edge_head", "edge"),
            ("vertex_head", "vertex"),
        ],
        13 => &[
            ("local_id", "node_id"),
            ("next_shell", "next"),
            ("back_faces", "face"),
            ("wire_edges", "edge"),
            ("isolated_vertex", "vertex"),
            ("region_ref", "region"),
            ("front_faces", "front_face"),
        ],
        14 => &[
            ("local_id", "node_id"),
            ("next_back", "next"),
            ("loop_head", "loop"),
            ("back_shell", "shell"),
            ("surface_ref", "surface"),
            ("orientation", "sense"),
            ("next_front", "next_front"),
            ("front_shell", "front_shell"),
        ],
        15 => &[
            ("local_id", "node_id"),
            ("fin_ref", "halfedge"),
            ("face_ref", "face"),
            ("next_loop", "next"),
        ],
        16 => &[
            ("local_id", "node_id"),
            ("precision", "tolerance"),
            ("fin_ref", "halfedge"),
            ("next_edge", "next"),
            ("curve_ref", "curve"),
            ("owner_ref", "owner"),
        ],
        17 => &[
            ("loop_ref", "loop"),
            ("forward_fin", "forward"),
            ("backward_fin", "backward"),
            ("end_vertex", "vertex"),
            ("radial_fin", "other"),
            ("edge_ref", "edge"),
            ("curve_ref", "curve"),
            ("orientation", "sense"),
        ],
        18 => &[
            ("local_id", "node_id"),
            ("next_vertex", "next"),
            ("point_ref", "point"),
            ("precision", "tolerance"),
            ("owner_ref", "owner"),
        ],
        19 => &[
            ("local_id", "node_id"),
            ("body_ref", "body"),
            ("next_region", "next"),
            ("shell_head", "shell"),
            ("region_kind", "type"),
        ],
        29 => &[
            ("local_id", "node_id"),
            ("owner_ref", "owner"),
            ("position", "pvec"),
        ],
        30 | 31 | 32 | 38 | 133 | 137 => &[
            ("local_id", "node_id"),
            ("owner_ref", "owner"),
            ("next_curve", "next"),
            ("previous_curve", "previous"),
            ("indirect_owner", "geometric_owner"),
            ("orientation", "sense"),
            ("origin", "pvec"),
            ("tangent", "direction"),
            ("center", "centre"),
            ("x_direction", "x_axis"),
            ("supporting_surfaces", "surface"),
            ("chart_ref", "chart"),
            ("start_limit", "start"),
            ("end_limit", "end"),
            ("basis_curve", "basis_curve"),
            ("start_point", "point_1"),
            ("end_point", "point_2"),
            ("start_parameter", "parm_1"),
            ("end_parameter", "parm_2"),
            ("surface_ref", "surface"),
            ("parameter_curve", "b_curve"),
            ("original_curve", "original"),
            ("original_tolerance", "tolerance_to_original"),
        ],
        50 | 51 | 52 | 53 | 54 | 56 | 59 | 60 | 68 | 124 => &[
            ("local_id", "node_id"),
            ("owner_ref", "owner"),
            ("next_surface", "next"),
            ("previous_surface", "previous"),
            ("indirect_owner", "geometric_owner"),
            ("orientation", "sense"),
            ("origin", "pvec"),
            ("center", "centre"),
            ("x_direction", "x_axis"),
            ("nurbs_ref", "nurbs"),
            ("blend_kind", "blend_type"),
            ("support_surfaces", "surface"),
            ("spine_curve", "spine"),
            ("offsets", "range"),
            ("boundary_index", "boundary"),
            ("blend_surface", "blend"),
            ("basis_surface", "surface"),
            ("profile_curve", "profile"),
            ("axis_origin", "base"),
            ("axis_direction", "axis"),
            ("start_point", "start"),
            ("end_point", "end"),
            ("start_parameter", "start_param"),
            ("end_parameter", "end_param"),
        ],
        40 => &[("sample_positions", "hvec")],
        41 => &[("limit_kind", "type"), ("limit_positions", "hvec")],
        126 => &[
            ("u_control_count", "n_u_vertices"),
            ("v_control_count", "n_v_vertices"),
            ("vertex_dimension", "vertex_dim"),
            ("u_knot_kind", "u_knot_type"),
            ("v_knot_kind", "v_knot_type"),
            ("u_knot_count", "n_u_knots"),
            ("v_knot_count", "n_v_knots"),
            ("control_vertices", "bspline_vertices"),
            ("u_multiplicities", "u_knot_mult"),
            ("v_multiplicities", "v_knot_mult"),
        ],
        136 => &[
            ("control_count", "n_vertices"),
            ("vertex_dimension", "vertex_dim"),
            ("knot_count", "n_knots"),
            ("knot_kind", "knot_type"),
            ("control_vertices", "bspline_vertices"),
            ("multiplicities", "knot_mult"),
        ],
        45 => &[("vertices", "vertices")],
        127 => &[("multiplicities", "mult")],
        134 => &[
            ("local_id", "node_id"),
            ("owner_ref", "owner"),
            ("next_curve", "next"),
            ("previous_curve", "previous"),
            ("indirect_owner", "geometric_owner"),
            ("orientation", "sense"),
            ("nurbs_ref", "nurbs"),
        ],
        _ => &[],
    };
    for field in &mut definition.fields {
        if let Some((_, role)) = pairs.iter().find(|(from, _)| field.name == *from) {
            field.name = (*role).to_owned();
        }
        field.name = match field.name.as_str() {
            "owner_ref" => "owner",
            "next_curve" | "next_surface" => "next",
            "previous_curve" | "previous_surface" => "previous",
            "indirect_owner" => "geometric_owner",
            "orientation" => "sense",
            other => other,
        }
        .to_owned();
    }
}

fn role_name_known(type_id: u16) -> Option<&'static str> {
    Some(match type_id {
        10 => "ASSEMBLY",
        11 => "INSTANCE",
        12 => "BODY",
        13 => "SHELL",
        14 => "FACE",
        15 => "LOOP",
        16 => "EDGE",
        17 => "HALFEDGE",
        18 => "VERTEX",
        19 => "REGION",
        29 => "POINT",
        30 => "LINE",
        31 => "CIRCLE",
        32 => "ELLIPSE",
        33 => "PARABOLA",
        34 => "HYPERBOLA",
        38 => "INTERSECTION",
        40 => "CHART",
        41 => "LIMIT",
        204 => "INTERSECTION_DATA",
        50 => "PLANE",
        51 => "CYLINDER",
        52 => "CONE",
        53 => "SPHERE",
        54 => "TORUS",
        56 => "BLENDED_EDGE",
        59 => "BLEND_BOUND",
        60 => "OFFSET_SURF",
        67 => "SWEPT_SURF",
        68 => "SPUN_SURF",
        69 => "CPS",
        45 => "BSPLINE_VERTICES",
        124 => "B_SURFACE",
        126 => "NURBS_SURF",
        127 => "KNOT_MULT",
        128 => "KNOT_SET",
        134 => "B_CURVE",
        136 => "NURBS_CURVE",
        137 => "SP_CURVE",
        133 => "TRIMMED_CURVE",
        _ => return None,
    })
}

fn role_name(type_id: u16) -> String {
    role_name_known(type_id)
        .map(str::to_owned)
        .unwrap_or_else(|| format!("T{type_id}"))
}

fn field_from_code(index: usize, code: &str) -> FieldDefinition {
    let (field_type, element_count) = match code {
        "d" => (FieldType::Integer, 0),
        "u" => (FieldType::UnsignedByte, 0),
        "n" => (FieldType::ShortInteger, 0),
        "f" => (FieldType::Double, 0),
        "c" => (FieldType::Character, 0),
        "l" => (FieldType::Logical, 0),
        "p" => (FieldType::PointerIndex, 0),
        "v" => (FieldType::Vector, 0),
        "i" => (FieldType::Interval, 0),
        "f9" => (FieldType::Double, 9),
        "p2" => (FieldType::PointerIndex, 2),
        "p3" => (FieldType::PointerIndex, 3),
        "f2" => (FieldType::Double, 2),
        "f3" => (FieldType::Double, 3),
        "c2" => (FieldType::Character, 2),
        "fv" => (FieldType::Double, 1),
        "s" => (FieldType::Character, 0),
        other => panic!("unknown field code {other}"),
    };
    FieldDefinition {
        name: format!("f{index}"),
        field_type,
        pointer_class: 0,
        element_count,
        transmitted: true,
    }
}
