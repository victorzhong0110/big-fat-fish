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
if(!executablePath)throw new Error('Set V2_CHROMIUM_EXECUTABLE; no silent browser skip.');
const catalog=loadContentCatalog(),session=createGameSession({runtimeProfile:'core-preview',runId:'browser:equipment',treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'tutorial',difficulty:0},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:1,cooldown:3,temporaryQuality:2,updateExpiresAt:600},{instanceId:'fan',definitionId:'mcp_fan',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_cache',skillCooldown:8,companionId:null,companionCooldown:0,dashCooldown:0}},19,catalog);
const state=readSessionState(session);disposeGameSession(session);state.world.entities=Object.fromEntries(Object.entries(state.world.entities).filter(([,e])=>e.kind!=='enemy'));const instanceId='ground:vector';state.world.pickups.loot={id:'loot',kind:'weapon',amount:1,position:{...state.world.entities.fish.position},instanceId,collected:false,weapon:{instanceId,definitionId:'mcp_vector',originalQuality:1,cooldown:0,temporaryQuality:null,updateExpiresAt:null}};
const checkpoint=createCheckpoint(state),output=path.join(root,'dist','v2-equipment-browser-check');await fs.mkdir(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const checks=[],errors=[];function check(value,label){assert(value,label);checks.push(label);}
const url=`http://127.0.0.1:${server.httpServer.address().port}/v2.html`;
try{
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#mode-select').selectOption('tutorial');
 check(await page.locator('#practice-weapon-a option').count()===6,'All six actual MCP behaviors are selectable in Free practice');
 await page.evaluate(cp=>localStorage.setItem('big-fat-fish:v2-combat-preview:checkpoint',JSON.stringify(cp)),checkpoint);await page.reload();await page.locator('#continue').click();await page.locator('#resume').click();await page.keyboard.press('f');await page.locator('#equipment-menu').waitFor({state:'visible'});
 check((await page.locator('#equipment-title').textContent()).includes('穿透'),'Real F interaction opens a named replacement preview at full slots');
 check(await page.locator('[data-equip-slot]').count()===2,'Both actual carried slots are offered, with an explicit leave option');
 const cooldown=await page.locator('#skill-cd').textContent();await page.waitForTimeout(250);check(await page.locator('#skill-cd').textContent()===cooldown,'Replacement preview freezes the world and real cooldowns');
 await page.screenshot({path:path.join(output,'equipment-preview.png')});await page.locator('[data-equip-slot="0"]').click();await page.waitForFunction(()=>document.querySelector('#weapon-label').textContent.includes('穿透'));check(await page.locator('#equipment-menu').isHidden(),'Selecting a slot resumes play with the actual new MCP');
 await page.keyboard.press('r');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('big-fat-fish:v2-combat-preview:checkpoint')).state.player.loadout.weapons[0].definitionId==='mcp_vector');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('big-fat-fish:v2-combat-preview:checkpoint')));
 check(saved.state.player.loadout.weapons[0].instanceId===instanceId&&saved.state.player.loadout.weapons[0].originalQuality===1,'Saved state retains the new instance and enhanced quality');
 const dropped=saved.state.world.pickups['drop:bubble'];check(dropped.weapon.cooldown>0&&dropped.weapon.cooldown<3&&dropped.weapon.temporaryQuality===2&&dropped.weapon.updateExpiresAt===600,'Displaced weapon keeps its remaining cooldown and bound temporary update');
 await page.reload();await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});await page.locator('#resume').click();await page.keyboard.press('f');await page.locator('#equipment-menu').waitFor({state:'visible'});check((await page.locator('#equipment-title').textContent()).includes('泡泡'),'The displaced weapon remains available after actual save/reload');
 await page.locator('#equipment-leave').click();check(await page.locator('#equipment-menu').isHidden(),'Leaving keeps the current weapon without deleting the floor item');
 await page.keyboard.press('f');await page.locator('#equipment-menu').waitFor({state:'visible'});await page.locator('[data-equip-slot="0"]').click();await page.waitForFunction(()=>document.querySelector('#weapon-label').textContent.includes('泡泡'));check(true,'The exact original weapon can be equipped again');
 const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),phone=await phoneContext.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(url);await phone.locator('#mode-select').selectOption('tutorial');await phone.evaluate(cp=>localStorage.setItem('big-fat-fish:v2-combat-preview:checkpoint',JSON.stringify(cp)),checkpoint);await phone.reload();await phone.locator('#continue').tap();await phone.locator('#resume').tap();await phone.locator('#interact').tap();await phone.locator('#equipment-menu').waitFor({state:'visible'});
 check(!(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'Phone replacement preview fits the screen width');const bounds=await phone.locator('[data-equip-slot="0"]').boundingBox();check(bounds.height>=44,'Replacement actions meet the mobile touch floor');await phone.screenshot({path:path.join(output,'equipment-mobile.png')});await phone.locator('[data-equip-slot="1"]').tap();await phone.locator('#equipment-menu').waitFor({state:'hidden'});await phone.locator('#switch').tap();await phone.waitForFunction(()=>document.querySelector('#weapon-label').textContent.includes('穿透'));check(true,'Touch replacement of the inactive slot and actual switching work together');
 check(errors.length===0,`No page errors: ${errors.join('; ')}`);const report={checks:checks.length,passed:checks,scope:'Controlled valid checkpoint; actual desktop/touch interaction and storage, not full human balance acceptance'};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
