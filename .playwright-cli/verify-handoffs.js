async page => {
  await page.setViewportSize({width:1672,height:941});
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const result = [];
  for (const kind of ['hero','process']) {
    const section = page.locator(`[data-scene="${kind}"]`);
    const metrics = await section.evaluate(el => ({
      top:el.getBoundingClientRect().top + scrollY,
      height:el.offsetHeight,
      viewport:innerHeight,
    }));
    for (const progress of [0.9,1,1.15]) {
      const y = metrics.top + (metrics.height-metrics.viewport)*progress;
      await page.evaluate(y=>scrollTo(0,y),y);
      await page.waitForTimeout(100);
      await page.screenshot({path:`frontend/docs/qa/handoff-${kind}-${progress}.png`});
      result.push(await section.evaluate(el=>({scene:el.dataset.scene,progress:el.dataset.progress,
        pinTop:el.querySelector('[data-scene-pin]').getBoundingClientRect().top,
        nextTop:el.nextElementSibling.getBoundingClientRect().top})));
    }
  }
  await page.evaluate(()=>scrollTo(0,0));
  return result;
}
