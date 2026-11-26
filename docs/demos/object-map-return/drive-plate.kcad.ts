// #1799 object-map return: each key becomes a named part of the Scene.
const plate = box(40, 30, 4);
const pinion = cylinder(10, 6).translate(10, 10, 4);

return { motor_plate: plate, drive_pinion: pinion };
