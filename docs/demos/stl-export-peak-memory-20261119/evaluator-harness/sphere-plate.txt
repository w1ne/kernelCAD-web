let body = box(260, 260, 4).translate(0, 0, -2);
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 6; j++) {
    body = body.union(sphere(36).translate(-105 + i * 42, -105 + j * 42, 12));
  }
}
return body;
