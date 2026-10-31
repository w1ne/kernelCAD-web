const block = box(60, 30, 10).translate(-30, 0, 0);
const boss = cylinder(15, 6).translate(15, 15, 10);
return block.union(boss).union(boss.mirror('yz'));
