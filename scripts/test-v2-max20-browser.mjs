import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {loadContentCatalog} from '../src/v2/content/catalog.js';
import {resolveDifficultySnapshot} from '../src/v2/domain/difficulty.js';
import {createGameSession,readSessionState,disposeGameSession} from '../src/v2/engine/session.js';
import {createCheckpoint} from '../src/v2/domain/checkpoint.js';
const executablePath=process.env.V2_CHROMIUM_EXECUTABLE;
if(!executablePath)throw Error('Set V2_CHROMIUM_EXECUTABLE');
const catalog=loadContentCatalog(),root=process.cwd(),checks=[],errors=[];
function check(value,label){assert(value,label);checks.push(label);}
function fixture(kind){
 const session=createGameSession({runtimeProfile:'adventure-slice',runId:`browser:max20:${kind}`,treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'short',difficulty:15},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_disconnect',skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}},19,catalog),s=readSessionState(session);disposeGameSession(session);
 s.world.entities=Object.fromEntries(Object.entries(s.world.entities).filter(([,e])=>e.kind!=='enemy'));
 for(const e of Object.values(s.world.entities))if(e.runtime.reinforcementPending)e.runtime.reinforcementPending=false;
 s.world.budgets=s.world.budgets.map(b=>b.id==='pursuers'?{...b,total:0}:b);
 const position=kind==='signal'?{x:850,y:650}:{x:800,y:1900};s.world.entities.fish.position=position;s.world.entities.fish.previousPosition={...position};return createCheckpoint(s);
}
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 for(const kind of ['integration','signal']){
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/v2.html`);
  const saved=await page.evaluate(async cp=>{const{createStoragePort}=await import('/src/v2/adapters/storage.js');const{readProfileRepository}=await import('/src/v2/application/repository.js');const{loadContentCatalog}=await import('/src/v2/content/catalog.js');const p=createStoragePort('big-fat-fish:v2:profile'),r=await readProfileRepository(p,loadContentCatalog());if(!r.ok)return r;const v=r.value;return p.compareAndSwap(v.revision,{revision:v.revision+1,profile:{...v.profile,revision:v.revision+1,highestDifficulty:14,apiUnlocked:false,checkpoint:cp}});},fixture(kind));assert(saved.ok);
  await page.reload();await page.locator('#mode-select').selectOption('short');
  await page.waitForFunction(()=>document.querySelector('#difficulty-select').options.length===15);
  if(kind==='integration')check(await page.locator('#difficulty-select option').count()===15,'Progression unlock exposes all fifteen formal difficulties');
  await page.locator('#continue').click();await page.locator('#resume').click();
  if(kind==='integration'){
   check((await page.locator('#pressure-label').textContent())==='','Optional integration does not activate before explicit interaction');
   await page.keyboard.press('f');await page.waitForFunction(()=>document.querySelector('#pressure-label').textContent.includes('综合压力'));
   const warning=await page.locator('#pressure-label').textContent();check(warning.split('预警').length===3,'One F starts exactly two visible four-second warnings');
   await page.keyboard.press('Escape');await page.waitForTimeout(80);const frozen=await page.locator('#pressure-label').textContent();await page.waitForTimeout(300);check(await page.locator('#pressure-label').textContent()===frozen,'Pause freezes the two coordinated warning clocks');
   await page.locator('#resume').click();await page.waitForFunction(()=>document.querySelector('#pressure-label').textContent.includes('进行中'));await page.waitForFunction(()=>Number(document.querySelector('#enemies').textContent)>0);check(true,'Warning expiration creates real first-stage enemies');
  }else{
   await page.waitForFunction(()=>document.querySelector('#pressure-label').textContent.includes('目标增援信号'));
   check(true,'Entering a real beacon starts its destructible reinforcement signal');
   // The camera follows a stationary fish at the beacon. The signal is 160 world units to its right.
   const box=await page.locator('#sea').boundingBox();const scale=Math.max(.7,Math.min(1,box.width/900,box.height/600));
   await page.mouse.move(box.x+box.width/2+160*scale,box.y+box.height/2);await page.mouse.down();
   await page.waitForFunction(()=>!document.querySelector('#pressure-label').textContent.includes('目标增援信号'),{timeout:10000});await page.mouse.up();
   check(true,'Actual aimed shots destroy the signal and cancel its reinforcement event');
   await page.waitForTimeout(700);check(!((await page.locator('#pressure-label').textContent()).includes('目标增援信号')),'Remaining inside the beacon does not recreate the destroyed signal');
  }
  await fs.mkdir(path.join(root,'dist/v2-max20-browser-check'),{recursive:true});await page.screenshot({path:path.join(root,`dist/v2-max20-browser-check/${kind}.png`)});
  await page.keyboard.press('Escape');await page.locator('#abandon').click();await page.waitForFunction(()=>!document.querySelector('#restart').closest('.hidden'));
 }
 check(errors.length===0,`No page errors: ${errors.join(';')}`);
 console.log(JSON.stringify({checks:checks.length,passed:checks,scope:'Controlled unlocked Profile and exploratory checkpoints; actual F, pause, timed spawning and manual aimed shooting'},null,2));
}finally{await browser.close();await server.close();}
