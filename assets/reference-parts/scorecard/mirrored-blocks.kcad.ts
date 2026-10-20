const block = box(10, 10, 10).translate(10, 0, 0);
return block.union(block.mirror('yz'));
