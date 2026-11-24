import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {CHARACTER_NAMES,characterSource,resolveCharacterModel} from '../src/v2/preview/characters.js';
const checks=[];const check=(ok,m)=>{assert(ok,m);checks.push(m);};
const approved=JSON.parse(await fs.readFile('public/art/characters/approved-art.json','utf8'));
for(const asset of approved){const bytes=await fs.readFile(`public/art/characters/${asset.file}`);const sha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');check(sha===asset.blobSha&&bytes.length===asset.size,`${asset.name}: exact reviewed source bytes`);check(characterSource(asset.name)===`./art/characters/${asset.file}`,`${asset.name}: renderer uses the reviewed source`);}
check(resolveCharacterModel('player_fish')==='deepseek','Player is the no-basin DeepSeek');
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.V2_CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],requests=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));const url=`http://127.0.0.1:${server.httpServer.address().port}/v2.html`;await page.goto(url);await page.waitForFunction(()=>document.querySelector('#wallet').textContent!=='小窝档案读取中');
 await page.locator('#characters-panel summary').click();await page.waitForFunction(count=>document.querySelectorAll('[data-model]').length===count,CHARACTER_NAMES.length);
 const faithful=await page.evaluate(async()=>{
  const {CHARACTER_NAMES,loadCharacterArt,drawCharacter}=await import('/src/v2/preview/characters.js');const results=[];
  for(const name of CHARACTER_NAMES){const image=await loadCharacterArt(name),actual=document.createElement('canvas'),expected=document.createElement('canvas');actual.width=expected.width=200;actual.height=expected.height=200;const a=actual.getContext('2d'),e=expected.getContext('2d');drawCharacter(a,name,100,100,160,{tick:0});e.imageSmoothingEnabled=false;const crop=name==='claude'?{x:16,y:176,w:384,h:240}:{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};const scale=160/Math.max(crop.w,crop.h),w=crop.w*scale,h=crop.h*scale;e.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(100-w/2),Math.round(100-h/2),w,h);results.push({name,equal:actual.toDataURL()===expected.toDataURL()});}
  for(const name of CHARACTER_NAMES){const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=200;a.height=b.height=200;const ac=a.getContext('2d'),bc=b.getContext('2d');drawCharacter(ac,name,100,100,160,{horizontal:-1});bc.translate(200,0);bc.scale(-1,1);drawCharacter(bc,name,100,100,160,{horizontal:1});results.push({name:`${name} mirrored`,equal:a.toDataURL()===b.toDataURL()});}
  return results;
 });for(const result of faithful)check(result.equal,`${result.name}: rendered pixels match direct approved-image rendering`);
 check(await page.locator('[data-model="deepseek"]').isVisible(),'DeepSeek appears in the actual gallery');
 const pixels=()=>page.locator('[data-model="deepseek"]').evaluate(c=>c.toDataURL());await page.locator('#model-pose').selectOption('control');await page.waitForTimeout(80);const still=await pixels();await page.waitForTimeout(200);check(await pixels()===still,'Control does not invent replacement frames');await page.locator('#model-pose').selectOption('idle');
 await page.evaluate(()=>{const gallery=document.querySelector('#character-gallery');document.body.replaceChildren(gallery);document.body.style.cssText='margin:0;padding:28px;background:#111e25;color:#e9e9d5';gallery.style.width='1120px';document.querySelector('.model-gallery').style.gridTemplateColumns='repeat(5,1fr)';document.querySelector('.model-controls').style.display='none';document.querySelector('[data-model="deepseek"]').closest('figure').querySelector('figcaption').textContent='Big Fat Fish / DeepSeek';});await page.waitForTimeout(100);await page.locator('#character-gallery').screenshot({path:'docs/design-v2/art-drafts/models-v2-overview.png'});
 await page.goto(url);await page.locator('#open-departure').click();await page.locator('#mode-guide').click();await page.locator('#start').click();await page.locator('#hud').waitFor({state:'visible'});
 check(await page.locator('.home-art img').getAttribute('src')==='./art/characters/deepseek.png','Home uses the same approved fish artwork');
 check(!requests.some(url=>url.includes('/art/models/')),'No rejected simplified character assets are requested');
 check(errors.length===0,`No browser errors: ${errors.join(', ')}`);console.log(`PASS ${checks.length} approved-art checks for ${CHARACTER_NAMES.length} characters`);
}finally{await browser.close();await server.close();}
