import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const executablePath=process.env.V2_CHROMIUM_EXECUTABLE;
if(!executablePath)throw new Error('Set V2_CHROMIUM_EXECUTABLE to an installed Chromium executable.');
const output=path.join(root,'dist','v2-interface-check');await fs.mkdir(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const url=`http://127.0.0.1:${server.httpServer.address().port}/v2.html`;
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const checks=[],errors=[];const check=(ok,message)=>{assert(ok,message);checks.push(message);};
const overlaps=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#wallet').textContent!=='小窝档案读取中');
 check(await page.locator('#home-screen').isVisible()&&await page.locator('#departure-screen').isHidden(),'Home is the first screen');
 check(await page.locator('.home-art img').evaluate(i=>i.complete&&i.naturalWidth>0),'Previously approved fish artwork loads on the home screen');
 await page.screenshot({path:path.join(output,'home.png')});
 await page.locator('#title-settings').click();await page.locator('[data-tab-setting=controls]').click();await page.locator('#home-escape-assist').check();await page.locator('#close-settings').click();
 await page.reload();await page.locator('#title-settings').click();await page.locator('[data-tab-setting=controls]').click();check(await page.locator('#home-escape-assist').isChecked()&&await page.locator('#escape-assist').isChecked(),'Control assistance persists and matches the in-game setting');await page.locator('#close-settings').click();
 await page.locator('#home-drawer > summary').click();await page.locator('#nest-panel > summary').click();check(await page.locator('#nest-panel').evaluate(e=>e.open),'Nest opens from home');await page.locator('#nest-panel > summary').click();
 await page.locator('#open-workshop').click();check(await page.locator('#workshop').evaluate(e=>e.open),'Workshop has a separate modal screen');await page.locator('#workshop form button').click();
 await page.locator('#open-departure').click();await page.screenshot({path:path.join(output,'departure.png')});
 await page.locator('#mode-guide').click();await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='0');check(await page.locator('#difficulty-select').isDisabled()&&await page.locator('#mode-guide').getAttribute('aria-pressed')==='true','Free teaching selects difficulty zero');
 await page.locator('#mode-short').click();await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='1');check(await page.locator('#mode-short').getAttribute('aria-pressed')==='true'&&!await page.locator('#difficulty-select').isDisabled(),'Short adventure selects unlocked Pro difficulty');
 await page.locator('#mode-expedition').click();check(await page.locator('#mode-expedition').getAttribute('aria-pressed')==='true'&&(await page.locator('#expedition-route').textContent()).includes('→'),'Expedition selects and previews its route');
 await page.locator('#back-home').click();check(await page.locator('#home-screen').isVisible(),'Return goes back to home');
 await page.locator('#open-departure').click();await page.locator('#mode-guide').click();await page.locator('#start').click();await page.locator('#hud').waitFor({state:'visible'});
 await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/art/characters/deepseek.png')));
 check(await page.locator('.growth-track').getAttribute('aria-valuenow')==='0','Experience progress exposes the real initial value');
 check(await page.locator('.growth-label .rice-icon').evaluate(i=>i.complete&&i.naturalWidth>0&&i.alt==='大白饭'),'Rice icon loads without relying on a system emoji font');
 check(!overlaps(await page.locator('.hud-details summary').boundingBox(),await page.locator('#pause').boundingBox()),'Status and pause buttons do not overlap on desktop');
 await page.screenshot({path:path.join(output,'battle.png')});
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#continue').disabled);await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});check(true,'Home continues the saved tutorial in the paused state');
 // Draw a detached pickup through the real renderer; confirm white rice and the blue bowl rim.
 const pickup=await page.evaluate(async()=>{
   const {renderPreviewFrame}=await import('/src/v2/preview/view.js');const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
   renderPreviewFrame(ctx,{tick:0,phase:'exploring',hud:{map:{width:3000,height:3000},aim:{x:1,y:0},rice:0,invulnerable:false},entities:[{id:'rice',kind:'pickup',spriteId:'riceXp',position:{x:230,y:270},radius:6}]},200,200,1,[]);
   const pixels=ctx.getImageData(90,90,20,20).data;let white=0,blue=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>225&&pixels[i+1]>225&&pixels[i+2]>220)white++;if(pixels[i]>=100&&pixels[i]<=130&&pixels[i+1]>=150&&pixels[i+1]<=185&&pixels[i+2]>=175&&pixels[i+2]<=205)blue++;}return {white,blue};
 });check(pickup.white>0&&pickup.blue>0,'Actual rice pickup is drawn with a rice mound and bowl rim');
 const shell=await page.evaluate(async()=>{
   const {renderPreviewFrame}=await import('/src/v2/preview/view.js');const c=document.createElement('canvas');c.width=c.height=200;const ctx=c.getContext('2d');
   const guard={id:'claude',kind:'enemy',spriteId:'enemy_claude_guard',position:{x:230,y:270},radius:26,weakArcDegrees:120,facingRadians:0,telegraphRemaining:0,hpFraction:1};
   renderPreviewFrame(ctx,{tick:0,phase:'exploring',hud:{map:{width:3000,height:3000},aim:{x:1,y:0},rice:0,invulnerable:false},entities:[guard]},200,200,1,[]);
   const region=(x)=>{const p=ctx.getImageData(x-3,97,7,7).data;let light=0;for(let i=0;i<p.length;i+=4)if(p[i]>220&&p[i+1]>190&&p[i+2]>140)light++;return light;};return {back:region(77),front:region(123)};
 });check(shell.back>shell.front,'Claude shell visibly marks the same rear weak arc used by combat');
 for(const [width,height] of [[844,390],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await context.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.waitForFunction(()=>document.querySelector('#wallet').textContent!=='小窝档案读取中');await phone.locator('#open-departure').tap();await phone.locator('#mode-guide').tap();if(await phone.locator('#continue').isEnabled()){await phone.locator('#continue').tap();await phone.locator('#resume').tap();}else await phone.locator('#start').tap();await phone.locator('#hud').waitFor({state:'visible'});
   check(!overlaps(await phone.locator('.hud-details summary').boundingBox(),await phone.locator('#pause').boundingBox()),`Status and pause do not overlap at ${width}×${height}`);
   for(const id of ['left-stick','right-stick','pause']){const box=await phone.locator(`#${id}`).boundingBox();check(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,`${id} is reachable at ${width}×${height}`);}
   await phone.screenshot({path:path.join(output,`battle-${width}x${height}.png`)});
 }
 check(errors.length===0,`No browser page errors: ${errors.join('; ')}`);console.log(JSON.stringify({checks:checks.length,passed:checks,screenshots:output},null,2));
}catch(error){for(const context of browser.contexts())for(const page of context.pages())console.error(await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,menu:document.querySelector('#menu')?.className,wallet:document.querySelector('#wallet')?.textContent,mode:document.querySelector('#mode-select')?.value,difficulty:document.querySelector('#difficulty-select')?.value,startDisabled:document.querySelector('#start')?.disabled})));throw error;}finally{await browser.close();await server.close();}
