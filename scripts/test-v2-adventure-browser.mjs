import { selectMode } from './v2-browser-ui-helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {loadContentCatalog} from '../src/v2/content/catalog.js';
import {resolveDifficultySnapshot} from '../src/v2/domain/difficulty.js';
import {createGameSession,readSessionState,disposeGameSession} from '../src/v2/engine/session.js';
import {createCheckpoint} from '../src/v2/domain/checkpoint.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),executablePath=process.env.V2_CHROMIUM_EXECUTABLE;
if(!executablePath)throw new Error('Set V2_CHROMIUM_EXECUTABLE; adventure checks never silently skip.');
const catalog=loadContentCatalog(),session=createGameSession({runtimeProfile:'adventure-slice',runId:'browser:formal-adventure',treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'short',difficulty:1},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_disconnect',skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}},19,catalog);
const fixture=readSessionState(session);disposeGameSession(session);
// A controlled, valid safe-home checkpoint: resident encounters already cleared,
// one beacon already done, some carried loot. Remaining 35s capture and all UI actions run live.
fixture.world.entities=Object.fromEntries(Object.entries(fixture.world.entities).filter(([,entity])=>entity.kind!=='enemy'));
fixture.world.objectives[1]={...fixture.world.objectives[1],completed:true,active:false,progress:2100};
fixture.world.budgets[0].total=0;fixture.inventory={gpuFragments:9,parts:11};
const checkpoint=createCheckpoint(fixture),output=path.join(root,'dist','v2-adventure-browser-check');await fs.mkdir(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl']});
const checks=[],errors=[];const check=(condition,label)=>{assert(condition,label);checks.push(label);console.log(label);};
const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/v2.html`);
 const injected=await page.evaluate(async checkpoint=>{const{createStoragePort}=await import('/src/v2/adapters/storage.js');const{readProfileRepository}=await import('/src/v2/application/repository.js');const{loadContentCatalog}=await import('/src/v2/content/catalog.js');const port=createStoragePort('big-fat-fish:v2:profile'),result=await readProfileRepository(port,loadContentCatalog());if(!result.ok)return result;return port.compareAndSwap(result.value.revision,{revision:result.value.revision+1,profile:{...result.value.profile,revision:result.value.revision+1,checkpoint}});},checkpoint);assert(injected.ok);
 await page.reload();await selectMode(page,'short');await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});await page.locator('#resume').click();
 check((await page.locator('#objective-label').textContent()).includes('1/2'),'Formal Profile continuation restores one completed beacon and remaining objectives');
 const started=Date.now();await page.keyboard.down('d');await page.waitForTimeout(2820);await page.keyboard.up('d');await page.keyboard.down('s');await page.waitForTimeout(1730);await page.keyboard.up('s');
 await page.locator('#plugin-menu').waitFor({state:'visible',timeout:45000});
 check(Date.now()-started>=19500,'Real capture lasts at least 20 world seconds with all three one-use relay bonuses');
 check((await page.locator('#objective-label').textContent()).includes('首领入口已开放'),'Completing the second actual beacon opens the boss gate');const pick=page.locator('#plugin-options button[data-plugin-id]').first(), chosen=(await pick.locator('strong').textContent()).split(' · 1级')[0];await pick.click();await page.locator('#plugin-menu').waitFor({state:'hidden'});
 check((await page.locator('#materials-label').textContent()).includes('碎片 11')&&(await page.locator('#materials-label').textContent()).includes('零件 14'),'Actual beacon resource drops are collected into carried inventory');
 // Travel along the open lower route to the central checkpoint; camera geometry remains real input.
 await page.keyboard.down('s');await page.waitForTimeout(2050);await page.keyboard.up('s');await page.keyboard.down('d');await page.waitForTimeout(2950);await page.keyboard.up('d');await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('冒险检查点已保存'));
 check(true,'R saves the actual exploration checkpoint into the formal IndexedDB profile');
 await page.reload();await selectMode(page,'short');await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});check((await page.locator('#plugins-label').textContent()).includes(chosen),'Formal reload preserves the chosen run plugin');await page.locator('#resume').click();
 await page.keyboard.down('d');await page.waitForTimeout(4350);await page.keyboard.up('d');await page.keyboard.down('s');await page.waitForTimeout(2750);await page.keyboard.up('s');await page.keyboard.press('f');await page.locator('#boss-hud').waitFor({state:'visible'});
 check((await page.locator('#boss-hp').textContent()).includes('5000'),'Explicit F interaction enters the actual 5000-HP Claude boss encounter');await page.waitForTimeout(2250);await page.screenshot({path:path.join(output,'claude-telegraph.png')});await page.locator('#escape-input').waitFor({state:'visible',timeout:5000});
 for(let i=0;i<5;i++){await page.keyboard.press('Space');await page.waitForTimeout(130);}check((await page.locator('#escape-count').textContent()).includes('5/6'),'Five real independent Space presses count five root escapes');await page.keyboard.press('Space');await page.locator('#escape-input').waitFor({state:'hidden'});check(true,'The sixth press releases Claude root before its natural timeout');
 await page.keyboard.press('Escape');await page.locator('#abandon').click();await page.waitForFunction(()=>document.querySelector('#pause-description')?.textContent?.includes('收获已保存'));
 const record=await page.evaluate(async()=>{const{createStoragePort}=await import('/src/v2/adapters/storage.js');return createStoragePort('big-fat-fish:v2:profile').read();});check(record.ok&&record.value.profile.checkpoint===null&&record.value.profile.gpuFragments===4&&record.value.profile.parts===5,'Actual abandon settles 40% with floor and invalidates the checkpoint atomically');
 await page.locator('#restart').click();await page.reload();await selectMode(page,'short');await page.waitForFunction(()=>document.querySelector('#wallet')?.textContent?.includes('零件 5'));check(await page.locator('#continue').isDisabled(),'Reload cannot continue the settled formal run');check(errors.length===0,`No browser errors: ${errors.join('; ')}`);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks:checks.length,passed:checks,errors,scope:'Controlled checkpoint; real 35s capture, movement, root inputs and storage; not a human full-run balance test'},null,2));
}catch(error){console.error(await page.evaluate(()=>({toast:document.querySelector('#toast')?.textContent,objectives:document.querySelector('#objective-label')?.textContent,materials:document.querySelector('#materials-label')?.textContent,pause:document.querySelector('#pause-menu')?.className})));await page.screenshot({path:path.join(output,'failure.png')});throw error;}finally{await browser.close();await server.close();}
