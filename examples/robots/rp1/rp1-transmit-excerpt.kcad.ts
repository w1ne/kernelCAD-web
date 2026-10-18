// One-body excerpt of the RP1.3.4 whole-robot transmit, for local Studio
// sessions (the full transmit is a ~7-minute import; this excerpt renders in
// seconds through the same read-and-lower path). Written on the lab drive by
// `cargo run --release --example excerpt` in crates/parasolid-import.
const robot = await lib.fromCAD('/Volumes/LabWired/rp1-cad/rp1-one-body.x_t', { sourceUnit: 'm' });
return robot;
