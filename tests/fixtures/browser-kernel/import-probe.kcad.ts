// A model with a literal dynamic import: the browser kernel must refuse it
// before it runs (tests/perf/paramEditFrame.spec.ts watches example.invalid).
void import('https://example.invalid/literal-import.js');
return box(10, 10, 10);
