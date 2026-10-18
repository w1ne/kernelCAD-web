//! Native parity check for the streaming whole-machine export: walk the
//! transmit once for the summary graph, then map every body separately.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::{CompactXtPayload, DocumentLimits, InspectionLimits, SchemaKey, compact_xt_owned};
use parasolid_import::stream::{SummaryGraph, stream_export};

fn main() {
    let path = std::env::args().nth(1).expect("path");
    let bytes = std::fs::read(&path).expect("read");
    let mut limits = DocumentLimits::default();
    limits.max_file_size = bytes.len().max(1);
    limits.max_nodes = 50_000_000;
    limits.max_variable_elements = 50_000_000;
    limits.retain_raw_bytes = false;
    let inspection = InspectionLimits {
        max_file_size: limits.max_file_size,
        max_string_bytes: limits.max_string_bytes,
        retain_source_offsets: false,
    };
    let started = std::time::Instant::now();
    let payload: CompactXtPayload = compact_xt_owned(bytes, inspection).expect("compact");
    println!(
        "compacted to {} bytes in {:.1}s",
        payload.payload().len(),
        started.elapsed().as_secs_f32()
    );
    let mode = std::env::args().nth(2).unwrap_or_default();
    if mode == "compact" {
        println!("compact-only peak: done");
        return;
    }
    let key = SchemaKey::parse(payload.header().schema_key.as_str()).expect("key");
    let provider = provider::for_key(&key);
    if mode == "graph" {
        let started = std::time::Instant::now();
        let (graph, _registry) = SummaryGraph::build(&payload, &provider, limits).expect("graph");
        println!(
            "graph summaries {} arena {} in {:.1}s",
            graph.summary_count(),
            graph.arena_len(),
            started.elapsed().as_secs_f32()
        );
        return;
    }
    let export = stream_export(&payload, &provider, limits).expect("stream");
    println!(
        "bodies {} mapped {} skipped {} bodies_json {} bytes instances {} biggest_mini {:?} first_skip {:?} in {:.1}s",
        export.body_count,
        export.mapped_bodies,
        export.skipped_bodies,
        export.bodies_json.len(),
        export.instances.len(),
        export.largest_mini,
        export.first_skip,
        started.elapsed().as_secs_f32()
    );
}
