// Paste this function in the existing Playwright browser_run_code_unsafe session.
// Replace the two URLs with capture.ts's printed jobUrl / playerUrl.
async (page) => {
  const bridge = 'http://127.0.0.1:51105';
  const player = 'http://127.0.0.1:51104/?headless=1&nowatermark=1';
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(player);
  await page.waitForFunction(() => !!window.__demoPlayer);
  for (let step = 0; step < 2; step++) {
    let job;
    for (let poll = 0; poll < 100 && !job; poll++) {
      job = await page.evaluate(async url => (await fetch(`${url}/job`)).json(), bridge);
      if (!job) await page.waitForTimeout(100);
    }
    if (!job) throw new Error('Timed out waiting for step meshes.');
    await page.evaluate(async ({ meshes, frame }) => {
      window.__demoPlayer.loadFeatureMeshes(meshes, frame.bounds);
      window.__demoPlayer.forceFullOpacity();
      window.__demoPlayer.showOnlyTailFeatures();
      await window.__demoPlayer.setRenderEnvironment(null);
      window.__demoPlayer.setRenderView(frame.view, 1, frame.bounds);
    }, job);
    const png = await page.screenshot({ type: 'png' });
    await page.evaluate(async ({ base64, url }) => {
      const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      await fetch(`${url}/image`, { method: 'POST', body: data });
    }, { base64: png.toString('base64'), url: bridge });
  }
  return 'Two real geometry snapshots captured with one shared frame.';
};
