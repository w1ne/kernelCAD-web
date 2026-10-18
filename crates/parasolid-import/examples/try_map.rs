//! Throwaway: run the B-rep mapper on a file and list every per-body
//! diagnostic, like the wasm reader's skippedBodies but complete.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::brep::map_xt_brep_with_diagnostic_limit;
use parasolid_core::{DocumentLimits, SchemaKey, inspect_xt, parse_xt};
use std::env;
use std::fs;

fn main() {
    let input = env::args().nth(1).expect("input .x_t path");
    let bytes = fs::read(&input).expect("read input");
    let limits = DocumentLimits {
        max_file_size: bytes.len().max(1),
        max_nodes: 50_000_000,
        max_variable_elements: 50_000_000,
        retain_raw_bytes: false,
        retain_source_offsets: false,
        ..DocumentLimits::default()
    };
    let header = inspect_xt(
        &bytes,
        parasolid_core::InspectionLimits {
            max_file_size: limits.max_file_size,
            max_string_bytes: limits.max_string_bytes,
            retain_source_offsets: false,
        },
    )
    .expect("header");
    let key = SchemaKey::parse(&header.schema_key).expect("key");
    let provider = provider::for_key(&key);
    let document = parse_xt(&bytes, &provider, limits).expect("parse");
    match map_xt_brep_with_diagnostic_limit(&document, 10_000) {
        Ok(model) => {
            println!(
                "mapped: bodies {} regions {} shells {} faces {} loops {} halfedges {} edges {} vertices {} complete {}",
                model.bodies.len(),
                model.regions.len(),
                model.shells.len(),
                model.faces.len(),
                model.loops.len(),
                model.half_edges.len(),
                model.edges.len(),
                model.vertices.len(),
                model.complete,
            );
            for body in &model.bodies {
                println!(
                    "  body {} kind {:?}: regions {} edges {} vertices {}",
                    body.id,
                    body.kind,
                    body.regions.len(),
                    body.edges.len(),
                    body.vertices.len()
                );
            }
            println!("diagnostics: {}", model.diagnostics.len());
            for diagnostic in model.diagnostics.iter().take(20) {
                println!(
                    "  [{}] {} ({}, node {:?})",
                    diagnostic.code, diagnostic.message, diagnostic.role, diagnostic.source
                );
            }
        }
        Err(error) => {
            println!("mapper error: {error}");
        }
    }
}
