async page => {
  const origin = 'http://127.0.0.1:5173';
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      failedRequests.push({ url: response.url(), status: response.status() });
    }
  });
  const checks = [];
  function check(name, passed, detail) {
    checks.push({ name, passed, detail });
  }
  async function settle() {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
  }
  async function scenePosition(kind, progress) {
    const target = await page.locator(`[data-scene="${kind}"]`).evaluate((section, progress) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const distance = Math.max(0, section.offsetHeight - window.innerHeight);
      return top + distance * progress;
    }, progress);
    await page.evaluate(y => window.scrollTo(0, y), target);
    await page.waitForTimeout(120);
    return target;
  }
  await page.goto(origin);
  await page.evaluate(() => localStorage.removeItem('gp-select.locale.v1'));
  await page.reload();
  await settle();
  check('Default locale is Spanish', await page.locator('html').getAttribute('lang') === 'es');
  check('Three original independent scenes', await page.locator('.scroll-scene[data-scene]').count() === 3);
  const dimensions = [[1440,900], [1672,941], [1920,1080], [820,1180], [390,844], [320,700]];
  for (const [width,height] of dimensions) {
    await page.setViewportSize({width,height});
    await page.goto(origin);
    await settle();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(`No horizontal overflow ${width}`, !overflow);
    for (const [kind,progress] of [['hero',0],['process',0.4],['vehicle',0.48]]) {
      await scenePosition(kind, progress);
      await page.screenshot({path:`frontend/docs/qa-phase3/${width}-${kind}-es.png`});
      const geometry = await page.locator(`[data-scene="${kind}"]`).evaluate(section => {
        const titles = [...section.querySelectorAll('[data-scene-title], .process-word')];
        return titles.map(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          return { text:el.textContent, x:r.x, right:r.right, width:r.width, font:getComputedStyle(el).fontSize };
        });
      });
      check(`Typography inside viewport ${width} ${kind}`, geometry.every(r => r.x >= -2 && r.right <= width+2), geometry);
    }
  }
  await page.setViewportSize({width:1672,height:941});
  await page.goto(origin);
  await settle();
  for (const kind of ['hero','process','vehicle']) {
    await scenePosition(kind,0.4);
    const state = async () => page.locator(`[data-scene="${kind}"]`).evaluate(section => ({
      progress:section.dataset.progress,
      elements:[...section.querySelectorAll('[data-scene-media], [data-scene-title], [data-process-word]')].map(el=>{
        const s=getComputedStyle(el);
        return {transform:s.transform, opacity:s.opacity, filter:s.filter};
      }),
    }));
    const initial = await state();
    await scenePosition(kind,0.9);
    await scenePosition(kind,0.4);
    const restored = await state();
    check(`Reversible state ${kind}`, JSON.stringify(initial) === JSON.stringify(restored), {initial,restored});
  }
  // Both fast jumps and successive wheel input must leave the timeline responsive.
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0,0));
  await page.waitForTimeout(100);
  for (let i=0;i<10;i++) { await page.mouse.wheel(0,85); await page.waitForTimeout(25); }
  const progressed = await page.locator('[data-scene="hero"]').getAttribute('data-progress');
  for (let i=0;i<10;i++) { await page.mouse.wheel(0,-85); await page.waitForTimeout(25); }
  await page.waitForTimeout(120);
  check('Slow wheel progresses and restores hero', Number(progressed)>0 && Number(await page.locator('[data-scene="hero"]').getAttribute('data-progress'))<0.02);
  await page.getByRole('button',{name:'English',exact:true}).click();
  await settle();
  check('English language switch', await page.locator('html').getAttribute('lang') === 'en');
  for (const [width,height] of dimensions) {
    await page.setViewportSize({width,height});
    await settle();
    for (const [kind,progress] of [['hero',0],['process',0.4],['vehicle',0.48]]) {
      await scenePosition(kind,progress);
      const bounds = await page.locator(`[data-scene="${kind}"]`).evaluate(section =>
        [...section.querySelectorAll('[data-scene-title], .process-word')].map(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const r = range.getBoundingClientRect();
          return {text:el.textContent,x:r.x,right:r.right};
        }));
      check(`English text inside viewport ${width} ${kind}`,bounds.every(r=>r.x>=-2 && r.right<=width+2),bounds);
    }
  }
  await page.setViewportSize({width:1672,height:941});
  await settle();
  for (const [kind,progress] of [['hero',0],['process',0.4],['vehicle',0.48]]) {
    await scenePosition(kind,progress);
    await page.screenshot({path:`frontend/docs/qa-phase3/1672-${kind}-en.png`});
  }
  await page.locator('.vehicle-scene .button').click();
  await settle();
  check('Locale persists on navigation', await page.locator('html').getAttribute('lang') === 'en');
  await page.reload();
  await settle();
  check('Locale persists after reload', await page.locator('html').getAttribute('lang') === 'en');
  check('No stale pins outside home', await page.locator('.pin-spacer').count() === 0);
  for (const route of ['/vehiculos/example','/importacion','/servicios','/nosotros','/contacto?intent=vehicle&vehicle=example','/admin']) {
    await page.goto(`${origin}${route}`);
    await settle();
    check(`Prepared route ${route}`, await page.locator('main h1').count()===1);
  }
  await page.goto(origin);
  await page.getByRole('button',{name:'Español',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await settle();
  await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
  check('Mobile menu opens', await page.locator('#mobile-navigation').isVisible());
  await page.keyboard.press('Escape');
  check('Escape closes menu', await page.locator('#mobile-navigation').count()===0);
  check('Menu restores focus', await page.getByRole('button',{name:'Abrir menú',exact:true}).evaluate(el=>el===document.activeElement));
  await page.setViewportSize({width:667,height:375});
  await settle();
  check('Short landscape has no pins',await page.locator('.pin-spacer').count()===0);
  await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
  const menuFits = await page.locator('#mobile-navigation').evaluate(el => {
    el.scrollTop = el.scrollHeight;
    return el.getBoundingClientRect().bottom <= innerHeight+1 && el.lastElementChild.getBoundingClientRect().bottom <= innerHeight+1;
  });
  check('Landscape menu last link reachable',menuFits);
  await page.screenshot({path:'frontend/docs/qa-phase3/667-landscape-menu.png'});
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await settle();
  check('Reduced motion removes pin spacers', await page.locator('.pin-spacer').count()===0);
  const reduced = await page.locator('[data-scene]').evaluateAll(sections=>sections.every(section=>section.dataset.motion==='static'));
  check('Reduced motion static scenes',reduced);
  await page.screenshot({path:'frontend/docs/qa-phase3/390-reduced-motion.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1672,height:941});
  await page.goto(origin);
  await settle();
  check('No browser runtime errors',errors.length===0,errors);
  check('No failed local responses',failedRequests.length===0,failedRequests);
  return {passed:checks.filter(c=>c.passed).length,total:checks.length,failures:checks.filter(c=>!c.passed)};
}
