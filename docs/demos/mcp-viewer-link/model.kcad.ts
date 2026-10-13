// Local MCP viewer demonstration: a width change must replace the model
// behind one Studio link. Millimetres; not a production-part claim.
const width = param('width', 20, { min: 10, max: 60 });
return box(width, 30, 10);
