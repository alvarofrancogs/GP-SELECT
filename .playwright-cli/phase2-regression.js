async page => {
  const stage = page.url().includes('baseline=1') ? 'before' : 'after';
  const result = [];
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.setItem('gp-select.locale.v1', 'es'));
  for (const [width,height] of [[1440,900],[1920,1080],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    for (const [kind,progress] of [['hero',0],['process',0.4],['vehicle',0.48]]) {
      const target = await page.locator(`[data-scene="${kind}"]`).evaluate((el,p) =>
        el.getBoundingClientRect().top + scrollY + (el.offsetHeight-innerHeight)*p, progress);
      await page.evaluate(y=>scrollTo(0,y),target);
      await page.waitForTimeout(150);
      await page.screenshot({path:`frontend/docs/qa-phase3/${stage}/${width}-${kind}.png`});
      result.push(await page.locator(`[data-scene="${kind}"]`).evaluate(el=>({
        scene:el.dataset.scene,progress:el.dataset.progress,top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight,
      })));
    }
  }
  await page.evaluate(()=>scrollTo(0,0));
  return {stage,result};
}
