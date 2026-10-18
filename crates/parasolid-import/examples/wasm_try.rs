//! Throwaway: call the wasm entry point natively on a file and print the
//! reader's JSON plus any debug lines, exactly as the browser would.

fn main() {
    let path = std::env::args().nth(1).expect("input path");
    let input = std::fs::read(&path).expect("read");
    let len = input.len() as u32;
    let ptr = parasolid_import::alloc(len);
    unsafe {
        std::ptr::copy_nonoverlapping(input.as_ptr(), ptr, input.len());
    }
    let n = parasolid_import::read_parasolid(ptr, len);
    let out = unsafe { std::slice::from_raw_parts(parasolid_import::result_ptr(), n as usize) };
    println!("{}", String::from_utf8_lossy(out));
    parasolid_import::dealloc(ptr, len);
}
