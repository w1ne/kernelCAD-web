// Intentional failure fixture for #1799. A part-ref chain must end in a
// Scene-returning .model() or .solvedModel(...) call.
return assembly('unbuilt-enclosure')
  .part('base', box(60, 40, 18))
  .part('lid', box(60, 40, 3).translate(0, 0, 18));
