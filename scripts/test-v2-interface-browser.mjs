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
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu']});
const checks=[],errors=[];const check=(ok,message)=>{assert(ok,message);checks.push(message);};
async function checkPrizeArtwork(page) {
 const result = await page.evaluate(async () => {
   const atlas = new Image();
   atlas.src = '/art/interface/prize-toys.webp';
   await atlas.decode();
   const side = atlas.naturalWidth / 6;
   if (!Number.isInteger(side) || side <= 0 || atlas.naturalHeight !== side * 6) throw Error('Invalid 6 × 6 atlas');
   const canvas = document.createElement('canvas');
   canvas.width = canvas.height = side;
   const ctx = canvas.getContext('2d', {willReadFrequently:true});
   return Array.from({length:36}, (_, index) => {
     ctx.clearRect(0, 0, side, side);
     ctx.drawImage(atlas, (index % 6) * side, Math.floor(index / 6) * side, side, side, 0, 0, side, side);
     const pixels = ctx.getImageData(0, 0, side, side).data;
     let opaque = 0;
     for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] >= 128) opaque++;
     return opaque / (side * side);
   });
 });
 check(result.slice(0,33).every(coverage => coverage > 0.1) && result.slice(33).every(coverage => coverage === 0),
   'The shipped WebP renders 33 visible toys and three empty reserve cells in Chromium');
 const mystery = await page.evaluate(async () => {
   const {createPrizeButton} = await import('/src/v2/preview/arcadePanels.js');
   const button = createPrizeButton({id:'community:prize',displayName:'未知奖品',parameters:{}}, 1);
   document.body.append(button);
   try {
     const image = new Image();
     image.src = getComputedStyle(button.querySelector('.prize-toy')).backgroundImage.slice(5,-2);
     await image.decode();
     return button.dataset.prizeCell === 'generic' && image.src.endsWith('/mystery-capsule.webp') && image.naturalWidth > 0;
   } finally { button.remove(); }
 });
 check(mystery, 'An unregistered prize visibly uses the sealed capsule asset');
}
async function battleFloor(page,label){
 const colors=await page.evaluate(()=>{
  const canvas=document.querySelector('#sea');const ctx=canvas.getContext('2d');if(!ctx)return [];
  const y=Math.floor(canvas.height*0.55),samples=[];
  for(let x=Math.floor(canvas.width*0.08);x<canvas.width*0.92;x+=6){const p=ctx.getImageData(x,y,1,1).data;samples.push([p[0],p[1],p[2]]);}
  return samples;
 });
 const sea=colors.filter(([r,g,b])=>r<70&&g>30&&g<130&&b>40&&b<160&&b+12>=g&&g+12>=r);
 check(sea.length>=8,`${label} floor stays low-contrast cyan`);
 check(new Set(sea.map(color=>color.join(','))).size>1,`${label} floor is tiled instead of one flat fill`);
 const covered=await page.evaluate(()=>{
  for(const id of ['switch','skill','dash','interact']){
   const button=document.querySelector(`#${id}`);if(!button)continue;
   const style=getComputedStyle(button);if(style.display==='none'||style.visibility==='hidden')continue;
   const rect=button.getBoundingClientRect();if(rect.width<8||rect.height<8)continue;
   const top=document.elementFromPoint(rect.left+rect.width/2,rect.top+Math.min(16,rect.height/2));
   if(top!==button&&!button.contains(top))return id;
  }
  const hint=document.querySelector('#objective-label');
  if(hint&&hint.textContent){const style=getComputedStyle(hint);if(style.whiteSpace!=='nowrap')return 'objective-wrap';}
  return '';
 });
 check(covered==='',`${label} controls stay clear (${covered||'ok'})`);
 const toastBox=await page.locator('#toast.visible').boundingBox().catch(()=>null),objectiveBox=await page.locator('#objective-label').boundingBox();
 if(toastBox&&objectiveBox)check(!overlaps(toastBox,objectiveBox),`${label} top hint does not cover the objective line`);
}
const overlaps=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#wallet').textContent.includes('算力卡'));
 await checkPrizeArtwork(page);
 check(await page.evaluate(async()=>{await document.fonts.load('12px "Fusion Pixel"');return document.fonts.check('12px "Fusion Pixel"');}),'Bundled pixel font loads offline');
 check((await page.locator('#toast').evaluate(el=>getComputedStyle(el).top))==='156px','Desktop toast sits below the objective row');
 check(await page.locator('#home-screen').isVisible()&&await page.locator('#departure-screen').isHidden(),'Home is the first screen');
 await page.locator('#pixel-logo').evaluate(image=>image.decode());
 check(await page.locator('#pixel-logo').evaluate(image=>image.naturalWidth>0&&image.alt==='big fat fish'),'The illustrated English title loads in the lobby');
 check(await page.locator('#wallet').evaluate(el=>el.tagName==='DIV'&&getComputedStyle(el).pointerEvents==='none'&&el.querySelectorAll('.pixel-icon').length===2),'Resource capsule shows two icons and cannot be clicked');
 check(await page.locator('#launch-dock').evaluate(el=>!el.textContent.includes('三连战')&&!el.textContent.includes('Free')),'Title dock keeps the slider and the difficulty button only');
 check(await page.locator('#mode-guide').isHidden()&&await page.locator('#mode-expedition').isHidden(),'Teaching and expedition stay off the title page');
 await page.locator('#mode-short').click();
 await page.waitForFunction(()=>document.querySelector('#mode-pill').dataset.slot==='0');
 await page.waitForFunction(()=>document.querySelector('.mode-thumb').getAnimations().every(animation=>animation.playState!=='running'));
 const storyThumb=await page.locator('.mode-thumb').boundingBox();
 await page.locator('#mode-tower').click();
 await page.evaluate(()=>new Promise(resolve=>{const thumb=document.querySelector('.mode-thumb');const done=()=>{thumb.removeEventListener('transitionend',done);resolve();};thumb.addEventListener('transitionend',done);setTimeout(done,600);}));
 const endlessThumb=await page.locator('.mode-thumb').boundingBox();
 const ease=await page.locator('.mode-thumb').evaluate(el=>getComputedStyle(el).transitionTimingFunction);
 const thumbInside=await page.evaluate(()=>{const pill=document.querySelector('#mode-pill').getBoundingClientRect(),thumb=document.querySelector('.mode-thumb').getBoundingClientRect();return thumb.left>=pill.left-1&&thumb.right<=pill.right+1&&thumb.top>=pill.top-1&&thumb.bottom<=pill.bottom+1;});
 check(storyThumb&&endlessThumb&&endlessThumb.x>storyThumb.x+storyThumb.width*0.8&&ease.includes('0.34')&&thumbInside,'Mode thumb slides inside the track with a bounce');
 const icons=page.locator('#home-screen .icon-btn');
 check(await icons.count()===7,'All seven lobby tools have their own illustrated silhouettes');
 for(const icon of await icons.all()){
   await icon.hover();
   check(!!await icon.getAttribute('aria-label')&&await icon.locator('.icon-tip').isHidden(),'Wordless icon keeps an accessible name even on hover');
 }
 await page.locator('#characters-panel > summary').focus();
 check(await page.locator('#characters-panel .icon-tip').isHidden(),'Keyboard focus keeps the wordless treatment');
 await page.screenshot({path:path.join(output,'home.png')});
 await page.locator('#settings-panel > summary').click();await page.locator('#settings-panel').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
 check(await page.locator('#settings-panel > summary').evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'Open drawer owns its close button above the lobby');
 await page.screenshot({path:path.join(output,'settings.png')});await page.locator('#home-escape-assist').check();await page.locator('#settings-panel > summary').click();
 await page.reload();await page.locator('#settings-panel > summary').click();check(await page.locator('#home-escape-assist').isChecked()&&await page.locator('#escape-assist').isChecked(),'Control assistance persists and matches the in-game setting');await page.locator('#settings-panel > summary').click();
 for(const id of ['nest-panel','mods-panel']){await page.locator(`#${id} > summary`).click();check(await page.locator(`#${id}`).evaluate(e=>e.open),`${id} opens from home`);await page.locator(id==='nest-panel'?'.nest-exit':`#${id} > summary`).click();}
 const homeBoxes=await Promise.all(['#pixel-logo','#launch-dock','#wallet','#nest-panel'].map(async selector=>({selector,box:await page.locator(selector).boundingBox()})));
 const view=page.viewportSize();
 for(const item of homeBoxes)check(item.box&&item.box.x>=-1&&item.box.y>=-1&&item.box.x+item.box.width<=view.width+1&&item.box.y+item.box.height<=view.height+1,`${item.selector} stays inside the desktop lobby`);
 check(!overlaps(homeBoxes[0].box,homeBoxes[1].box),'Title and mode dock do not overlap');
 await page.locator('#open-departure').click();await page.locator('#stage-cast img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.locator('#stage-cast').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));await page.screenshot({path:path.join(output,'departure.png')});
 const bench=await Promise.all(['.bench-detail','#benchmark-list','#start'].map(async selector=>({selector,box:await page.locator(selector).boundingBox()})));
 for(const item of bench)check(item.box&&item.box.x>=-1&&item.box.y>=-1&&item.box.x+item.box.width<=view.width+1&&item.box.y+item.box.height<=view.height+1,`${item.selector} stays inside the desktop difficulty page`);
 check(!overlaps(bench[0].box,bench[1].box),'Difficulty detail and Benchmark list do not overlap');
 check(!overlaps(bench[2].box,await page.locator('#launch-dock').boundingBox()),'Start stays clear of the mode dock');
 await page.locator('#mode-guide').click();await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='0');check(await page.locator('#difficulty-select').isDisabled()&&await page.locator('#mode-guide').getAttribute('aria-pressed')==='true','Free teaching selects difficulty zero');
 await page.locator('#mode-short').click();await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='1');check(await page.locator('#mode-short').getAttribute('aria-pressed')==='true'&&!await page.locator('#difficulty-select').isDisabled(),'Short adventure selects unlocked Pro difficulty');
 const wheel=page.locator('#benchmark-list');
 await wheel.focus();
 for(let i=0;i<5;i++)await page.keyboard.press('ArrowUp');
 await page.waitForFunction(()=>document.querySelector('#bench-title').textContent==='Benchmark 6');
 const rows=await wheel.evaluate(el=>{
   const clip=el.getBoundingClientRect(),boxes=Array.from(el.children,child=>child.getBoundingClientRect());
   return {whole:boxes.filter(b=>b.top>=clip.top-.6&&b.bottom<=clip.bottom+.6).length,visible:boxes.filter(b=>b.bottom>clip.top+.6&&b.top<clip.bottom-.6).length};
 });
 check(rows.whole===3&&rows.visible===5,'A settled middle Benchmark shows three full rows and two partial neighbours');
 check(await page.locator('#bench-affixes').innerText()==='？'&&await page.locator('.motion-mystery').count()===1&&await page.locator('#start').isDisabled(),'Locked stage shows one silhouette and hides mechanics');
 await page.screenshot({path:path.join(output,'bench-locked.png')});
 await wheel.hover();await page.mouse.wheel(0,120);
 await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='5');
 await page.keyboard.press('Home');
 await page.waitForFunction(()=>document.querySelector('#difficulty-select').value==='1'&&!document.querySelector('#start').disabled);
 await page.locator('#mode-expedition').click();check(await page.locator('#mode-expedition').getAttribute('aria-pressed')==='true'&&(await page.locator('#expedition-route').textContent()).includes('→'),'Expedition selects and previews its route');
 await page.locator('#mode-exploration').click();check(await page.locator('.bench-row[data-benchmark="1"]').getAttribute('data-locked')==='true'&&await page.locator('#start').isDisabled(),'Locked exploration can be inspected and cannot launch');
 await page.locator('#back-home').click();check(await page.locator('#home-screen').isVisible(),'Return goes back to home');
 await page.locator('#open-departure').click();await page.locator('#mode-guide').click();await page.locator('#start').click();await page.locator('#hud').waitFor({state:'visible'});
 await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/art/characters/deepseek.png')));
 check(await page.locator('.growth-track').getAttribute('aria-valuenow')==='0','Experience progress exposes the real initial value');
 check(await page.locator('.vitals .rice-icon').evaluate(i=>i.complete&&i.naturalWidth>0&&i.alt==='大白饭'),'Rice icon loads without relying on a system emoji font');
 check(!overlaps(await page.locator('.hud-details summary').boundingBox(),await page.locator('#pause').boundingBox()),'Status and pause buttons do not overlap on desktop');
 await battleFloor(page,'Desktop battle');
 await page.screenshot({path:path.join(output,'battle.png')});
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#continue').disabled);await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});check(true,'Home continues the saved tutorial in the paused state');
 check(await page.locator('.paper-eye').count()===2&&await page.getByText('正在工作',{exact:true}).isVisible(),'Pause shows two paper eyes and the work sign');
 await page.screenshot({path:path.join(output,'pause.png')});
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
 // Inspect the same wheel and stage that the new profile uses, with a progressed test profile.
 await page.evaluate(async()=>{
   const {createStoragePort}=await import('/src/v2/adapters/storage.js');
   const {readProfileRepository,commitProfilePlan}=await import('/src/v2/application/repository.js');
   const {loadContentCatalog}=await import('/src/v2/content/catalog.js');
   const catalog=loadContentCatalog(),port=createStoragePort('big-fat-fish:v2:profile');
   const record=await readProfileRepository(port,catalog);
   const profile=record.value.profile;
   const saved=await commitProfilePlan(port,{expectedRevision:profile.revision,next:{...profile,revision:profile.revision+1,highestDifficulty:8},events:[]},catalog);
   if(!saved.ok)throw Error(saved.message);
 });
 await page.reload();await page.locator('#mode-short').click();await page.locator('#open-departure').click();
 await wheel.focus();for(let i=0;i<3;i++)await page.keyboard.press('ArrowUp');
 await page.locator('#stage-cast[data-scene="4"] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 check(await page.locator('.motion-hammer').count()===1&&await page.locator('.motion-breakable').count()===1,'B4 stages the heavy claw and destructible cover');
 check(await page.locator('#bench-affixes').innerText()==='Claude重钳破阵','B4 shows only the newly introduced mechanic');
 await page.screenshot({path:path.join(output,'benchmark-4.png')});
 const bounds=await wheel.boundingBox(),row=await page.locator('.bench-row[aria-pressed=true]').boundingBox();
 const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+row.height,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#bench-title').textContent==='Benchmark 5');
 await wheel.focus();for(let i=0;i<3;i++)await page.keyboard.press('ArrowUp');
 await page.waitForFunction(()=>document.querySelector('#stage-cast').dataset.scene==='8');
 check(await page.locator('.motion-flank-left').count()===2&&await page.locator('.motion-flank-right').count()===2,'Real mouse drag snaps once and B8 previews both entrances');
 await page.locator('#stage-cast').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
 await page.screenshot({path:path.join(output,'benchmark-8.png')});
 for(const [width,height] of process.argv.includes('--desktop')?[]:[[844,390],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});const phone=await context.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.waitForFunction(()=>document.querySelector('#wallet').textContent.includes('算力卡'));
   const logo=await phone.locator('#pixel-logo').boundingBox(),dock=await phone.locator('#launch-dock').boundingBox(),wallet=await phone.locator('#wallet').boundingBox(),nest=await phone.locator('#nest-panel').boundingBox();
   const fits=(box,label)=>check(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${label} stays inside ${width}×${height}`);
   fits(logo,'Title');fits(dock,'Mode dock');fits(wallet,'Wallet');fits(nest,'Nest');
   check(logo&&dock&&wallet&&nest&&!overlaps(logo,dock)&&!overlaps(logo,wallet)&&!overlaps(logo,nest),`Lobby title stays clear at ${width}×${height}`);
   check(await phone.locator('.icon-tip').first().evaluate(el=>getComputedStyle(el).display==='none'),`Icon captions stay off the phone at ${width}×${height}`);
   await phone.locator('#open-departure').tap();
   const detail=await phone.locator('.bench-detail').boundingBox(),list=await phone.locator('#benchmark-list').boundingBox(),start=await phone.locator('#start').boundingBox(),benchDock=await phone.locator('#launch-dock').boundingBox();
   for(const [box,label] of [[detail,'Difficulty detail'],[list,'Benchmark list'],[start,'Start']])fits(box,label);
   check(detail&&list&&start&&benchDock&&!overlaps(detail,list)&&!overlaps(start,benchDock)&&!overlaps(start,list),`Difficulty page does not overlap at ${width}×${height}`);
   await phone.screenshot({path:path.join(output,`bench-${width}x${height}.png`)});
   await phone.locator('#mode-guide').tap();if(await phone.locator('#continue').isEnabled()){await phone.locator('#back-home').tap();await phone.locator('#continue').tap();await phone.locator('#resume').tap();}else await phone.locator('#start').tap();await phone.locator('#hud').waitFor({state:'visible'});
   check(!overlaps(await phone.locator('.hud-details summary').boundingBox(),await phone.locator('#pause').boundingBox()),`Status and pause do not overlap at ${width}×${height}`);
   await battleFloor(phone,`Battle ${width}×${height}`);
   for(const id of ['left-stick','right-stick','pause']){const box=await phone.locator(`#${id}`).boundingBox();check(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height,`${id} is reachable at ${width}×${height}`);}
   await phone.screenshot({path:path.join(output,`battle-${width}x${height}.png`)});await context.close();
 }
 check(errors.length===0,`No browser page errors: ${errors.join('; ')}`);console.log(JSON.stringify({checks:checks.length,passed:checks,screenshots:output},null,2));
}catch(error){for(const context of browser.contexts())for(const page of context.pages())console.error(await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,menu:document.querySelector('#menu')?.className,wallet:document.querySelector('#wallet')?.textContent,mode:document.querySelector('#mode-select')?.value,difficulty:document.querySelector('#difficulty-select')?.value,startDisabled:document.querySelector('#start')?.disabled})));throw error;}finally{await browser.close();await server.close();}
