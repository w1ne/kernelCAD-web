// The kernelcad.com hero. This is the vendor SO-ARM100 follower as one
// assembled solid: base, five servos, the links, and the gripper. The
// 2-servo script beside this file is the mate-graph example. The landing
// clip orbits this robot.

const arm = await lib.fromSTEP('parts/SO100_Assembly.step');
return arm;
