async page => {
  const origin = 'http://127.0.0.1:5173/';
  const checks = [];
  const errors = [];
  const failedRequests = [];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith(origin) && response.status()>=400) failedRequests.push(response.url());});
  const check = (name,passed,detail) => checks.push({name,passed,detail});
  const settle = async () => { await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(350); };
  async function scrollSection(selector,progress=0) {
    const y = await page.locator(selector).evaluate((el,p)=>el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*p,progress);
    await page.evaluate(y=>scrollTo(0,y),y);
    await page.waitForTimeout(180);
  }
  await page.goto(origin);
  await page.evaluate(()=>localStorage.removeItem('gp-select.locale.v1'));
  await page.reload();
  check('Spanish default',await page.locator('html').getAttribute('lang')==='es');
  for (const locale of ['es','en']) {
    await page.getByRole('button',{name:locale==='es'?'Español':'English',exact:true}).click();
    for (const [width,height] of [[1440,900],[1920,1080],[390,844],[320,700]]) {
      await page.setViewportSize({width,height});
      await page.mouse.move(width-1,height-1);
      await settle();
      for (const [selector,name,progress] of [['#servicios','services',0],['#seleccion','inventory',0],['#europa','europe',0.45]]) {
        await scrollSection(selector,progress);
        const geometry = await page.locator(selector).evaluate(section=>{
          const targets = [...section.querySelectorAll('h2,h3,.service-toggle,.europe-countries li')];
          return targets.map(el=>{
            const range=document.createRange();range.selectNodeContents(el);
            const r=range.getBoundingClientRect();
            return {text:el.textContent,left:r.left,right:r.right};
          });
        });
        check(`${locale} ${width} ${name} text visible`,geometry.every(r=>r.left>=-1 && r.right<=width+1),geometry);
        check(`${locale} ${width} ${name} no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.screenshot({path:`frontend/docs/qa-phase3/${width}-${name}-${locale}.png`});
        if (name==='inventory' && width>=1440) await page.locator(selector).screenshot({path:`frontend/docs/qa-phase3/${width}-inventory-full-${locale}.png`});
      }
      await page.locator('.site-footer').scrollIntoViewIfNeeded();
      await settle();
      await page.screenshot({path:`frontend/docs/qa-phase3/${width}-footer-${locale}.png`});
      const footerOverflow=await page.locator('.site-footer').evaluate(el=>el.scrollWidth<=el.clientWidth);
      check(`${locale} ${width} footer fits`,footerOverflow);
      const countries=await page.locator('.europe-countries li').evaluateAll(items=>items.map(el=>({text:el.textContent,client:el.clientWidth,scroll:el.scrollWidth})));
      check(`${locale} ${width} country cells fit`,countries.every(c=>c.scroll<=c.client+1),countries);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Español',exact:true}).click();
  await settle();
  await scrollSection('#servicios');
  const toggles=page.locator('.service-toggle');
  check('Four accordions',await toggles.count()===4);
  for (let i=0;i<4;i++) {
    await toggles.nth(i).click();
    await settle();
    const button=await toggles.nth(i).getAttribute('aria-controls');
    check(`Accordion ${i+1} opens labelled panel`,await page.locator(`[id="${button}"]`).isVisible());
    check(`Accordion ${i+1} single active`,await page.locator('.service-toggle[aria-expanded="true"]').count()===1);
  }
  await toggles.nth(3).focus();
  await page.keyboard.press('Enter');
  await settle();
  check('Accordion keyboard closes',await page.locator('.service-toggle[aria-expanded="true"]').count()===0);
  await scrollSection('#europa',.45);
  const state = () => page.locator('[data-europe-vehicle]').getAttribute('style');
  const original=await state();
  await scrollSection('#europa',.9);
  await scrollSection('#europa',.45);
  check('Europe timeline reversible after accordion layout changes',original===await state());
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Volver arriba',exact:true}).click();
  await settle();
  check('Footer return restores hero',await page.evaluate(()=>scrollY===0));
  check('Footer return restores focus',await page.locator('.header-brand').evaluate(el=>el===document.activeElement));
  await page.locator('.vehicle-preview--featured .button').click();
  check('Example enquiry has search context without fake vehicle slug',page.url().includes('intent=search') && !page.url().includes('&vehicle='));
  check('SPA exit cleans all pins',await page.locator('.pin-spacer').count()===0);
  await page.goto(origin);
  await settle();
  await page.locator('.footer-main .button').click();
  check('Footer enquiry context',page.url().includes('intent=information') && page.url().includes('source=home-footer'));
  await page.goto(origin);
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await settle();
  check('Reduced motion removes all pins',await page.locator('.pin-spacer').count()===0);
  await scrollSection('#europa');
  check('Europe static in reduced motion',await page.locator('#europa').getAttribute('data-motion')==='static');
  await page.screenshot({path:'frontend/docs/qa-phase3/390-europe-reduced.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:667,height:375});
  await settle();
  check('Low viewport static pins',await page.locator('.pin-spacer').count()===0);
  await scrollSection('#europa');
  await page.screenshot({path:'frontend/docs/qa-phase3/667-europe-landscape.png'});
  await page.setViewportSize({width:1440,height:900});
  await page.goto(origin);
  await settle();
  check('No browser errors',errors.length===0,errors);
  check('No failed responses',failedRequests.length===0,failedRequests);
  return {passed:checks.filter(c=>c.passed).length,total:checks.length,failures:checks.filter(c=>!c.passed)};
}
