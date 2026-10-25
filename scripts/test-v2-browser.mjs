import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

import { loadContentCatalog } from '../src/v2/content/catalog.js';
import { resolveDifficultySnapshot } from '../src/v2/domain/difficulty.js';
import { createGameSession, readSessionState, disposeGameSession } from '../src/v2/engine/session.js';
import { createCheckpoint } from '../src/v2/domain/checkpoint.js';
const catalog=loadContentCatalog();
const fixtureSession=createGameSession({runtimeProfile:'core-preview',runId:'browser:growth',treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'tutorial',difficulty:0},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_cache',skillCooldown:8,companionId:null,companionCooldown:0,dashCooldown:0}},19,catalog);
const growthState=readSessionState(fixtureSession);disposeGameSession(fixtureSession);
growthState.world.entities=Object.fromEntries(Object.entries(growthState.world.entities).filter(([,entity])=>entity.kind!=='enemy'));
growthState.world.pickups.rice={id:'rice',kind:'riceXp',amount:120,position:{...growthState.world.entities.fish.position},collected:false,instanceId:null};
const growthCheckpoint=createCheckpoint(growthState);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const executablePath=process.env.V2_CHROMIUM_EXECUTABLE;
if(!executablePath)throw new Error('Set V2_CHROMIUM_EXECUTABLE to an installed Chromium executable; this check never silently skips the browser.');
const output=process.env.V2_BROWSER_OUTPUT||path.join(root,'dist','v2-browser-check');
await fs.mkdir(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0}});await server.listen();
const address=server.httpServer.address();const base=`http://127.0.0.1:${address.port}`;
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl']});
const checks=[];const errors=[];
function check(condition,label){assert(condition,label);checks.push(label);}
try{
 const desktop=await browser.newContext({viewport:{width:1280,height:800}});const page=await desktop.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/v2.html');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'desktop-menu.png')});
 await page.locator('#start').click();await page.waitForTimeout(350);
 check(await page.locator('#menu').isHidden(),'Desktop start opens combat');
 check((await page.locator('#enemies').textContent())==='15','Preview contains three strong crabs and twelve simple Bots');
 check(await page.locator('#hp-label').textContent()==='100 / 100','Start has the correct player life');
 await page.locator('#checkpoint').click();await page.waitForTimeout(150);
 check((await page.locator('#toast').textContent()).includes('已保存'),'Safe checkpoint saves through the actual button');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('big-fat-fish:v2-combat-preview:checkpoint')));
 check(saved.state.world.entities.fish.hp===100&&saved.state.start.runtimeProfile==='core-preview','Saved record is a real full preview state');
 const beforeSwitch=await page.locator('#weapon-label').textContent();await page.keyboard.press('q');await page.waitForTimeout(120);check((await page.locator('#weapon-label').textContent())!==beforeSwitch,'Q switches the actual weapon');
 await page.keyboard.press('e');await page.waitForTimeout(100);check((await page.locator('#skill-cd').textContent())!=='就绪','E starts a real skill cooldown');
 await page.keyboard.press('Escape');await page.waitForTimeout(80);const cooldown=await page.locator('#skill-cd').textContent();await page.waitForTimeout(200);
 check(await page.locator('#pause-menu').isVisible()&&(await page.locator('#skill-cd').textContent())===cooldown,'Pause freezes the real cooldown display');
 await page.reload();await page.locator('#continue').click();await page.waitForTimeout(150);check(await page.locator('#pause-menu').isVisible(),'Reload/continue restores paused instead of running immediately');
 check(await page.locator('#hp-label').textContent()==='100 / 100','Continue preserves life');await page.locator('#resume').click();await page.waitForTimeout(100);check(await page.locator('#pause-menu').isHidden(),'Continue actually resumes the running world');
 await page.keyboard.down('d');await page.mouse.move(930,408);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();await page.keyboard.up('d');
 check(await page.locator('#pause-menu').isHidden(),'Movement and shooting remain live after restore');
 await page.screenshot({path:path.join(output,'desktop-combat.png')});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1);check(!overflow,'Desktop has no page overflow');
 // Controlled saved-state fixture; rice is collected and converted by the real browser Session.
 await page.evaluate(checkpoint=>localStorage.setItem('big-fat-fish:v2-combat-preview:checkpoint',JSON.stringify(checkpoint)),growthCheckpoint);
 await page.reload();await page.locator('#continue').click();await page.locator('#resume').click();await page.locator('#plugin-menu').waitFor({state:'visible'});
 check(await page.locator('#level').textContent()==='2'&&await page.locator('[data-plugin-id="plugin_distill"]').count()===1,'Real rice pickup opens level-two plugin choice with guaranteed distill');
 const choiceCooldown=await page.locator('#skill-cd').textContent();await page.waitForTimeout(200);check(await page.locator('#skill-cd').textContent()===choiceCooldown,'Plugin choice freezes world cooldowns');
 await page.screenshot({path:path.join(output,'desktop-growth.png')});
 await page.locator('[data-plugin-id="plugin_distill"]').click();await page.waitForFunction(()=>document.querySelector('#level')?.textContent==='4');
 check((await page.locator('#plugins-label').textContent()).includes('蒸馏1')&&await page.locator('#hp-label').textContent()==='106 / 106','Choice installs distill, processes level three then opens level four exactly once');
 await page.locator('#plugin-reroll').click();await page.waitForFunction(()=>document.querySelector('#plugin-reroll')?.hasAttribute('disabled'));check(await page.locator('#plugin-options button').count()===3,'Reroll creates a new unique three-card group and consumes its whole-run use');
 await page.locator('#plugin-skip').click();await page.locator('#plugin-menu').waitFor({state:'hidden'});check(await page.locator('#pause-menu').isHidden(),'Skipping resolves the queue and resumes the world');
 await page.locator('#checkpoint').click();await page.waitForTimeout(120);await page.reload();await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});check((await page.locator('#plugins-label').textContent()).includes('蒸馏1')&&await page.locator('#level').textContent()==='4','Actual save and reload preserve the chosen plugin and progression');
 // Synthetic pointer cancellation is exercised with trusted multi-touch input via CDP.
 const mobile=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',error=>errors.push(error.message));
 await phone.goto(base+'/v2.html');await phone.evaluate(()=>document.fonts.ready);await phone.screenshot({path:path.join(output,'mobile-menu.png')});await phone.locator('#start').tap();await phone.waitForTimeout(150);
 const left=await phone.locator('#left-stick').boundingBox(),right=await phone.locator('#right-stick').boundingBox();check(!!left&&!!right,'Both mobile sticks are visible');
 const cdp=await mobile.newCDPSession(phone);
 const points=[{id:1,x:left.x+left.width/2,y:left.y+left.height/2},{id:2,x:right.x+right.width/2,y:right.y+right.height/2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[0],x:points[0].x+25},{...points[1],x:points[1].x+25}]});await phone.waitForTimeout(150);
 check((await phone.locator('#left-stick span').getAttribute('style'))?.includes('translate')&&(await phone.locator('#right-stick span').getAttribute('style'))?.includes('translate'),'Mobile movement and firing sticks accept concurrent touches');
 await phone.screenshot({path:path.join(output,'mobile-combat.png')});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await phone.waitForTimeout(80);
 check(!(await phone.locator('#left-stick span').getAttribute('style'))&&!(await phone.locator('#right-stick span').getAttribute('style')),'Pointer cancellation clears both virtual sticks');
 await phone.locator('#pause').tap();await phone.locator('#pause-menu').waitFor({state:'visible'});check(await phone.locator('#pause-menu').isVisible(),'Mobile can pause through its button');
 check(!(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1)),'Mobile landscape has no page overflow');
 await phone.evaluate(checkpoint=>localStorage.setItem('big-fat-fish:v2-combat-preview:checkpoint',JSON.stringify(checkpoint)),growthCheckpoint);await phone.reload();await phone.locator('#continue').tap();await phone.locator('#resume').tap();await phone.locator('#plugin-menu').waitFor({state:'visible'});
 check(await phone.locator('[data-plugin-id="plugin_distill"]').isVisible(),'Mobile plugin choice exposes a real touch-selectable distill card');await phone.screenshot({path:path.join(output,'mobile-growth.png')});
 const actionBounds=await phone.locator('#plugin-skip').boundingBox();check(actionBounds.y>=0&&actionBounds.y+actionBounds.height<=390,'Landscape plugin actions fit onscreen without hidden bottom controls');
 await phone.setViewportSize({width:390,height:844});await phone.screenshot({path:path.join(output,'mobile-growth-portrait.png')});check(!(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'Portrait plugin choice fits the phone width');await phone.setViewportSize({width:844,height:390});await phone.locator('[data-plugin-id="plugin_distill"]').tap();await phone.waitForFunction(()=>document.querySelector('#level')?.textContent==='4');await phone.locator('#plugin-skip').tap();await phone.locator('#plugin-menu').waitFor({state:'hidden'});check((await phone.locator('#plugins-label').textContent()).includes('蒸馏1'),'Mobile touch choices install the plugin and finish queued growth');
 check(errors.length===0,`No browser page errors: ${errors.join('; ')}`);
 const report={checks:checks.length,passed:checks,errors,scope:'Browser automation, not human playtest',screenshots:output};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 // The serverless single-process build closes all contexts with the browser.
}finally{await browser.close();await server.close();}
