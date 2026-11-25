import { selectMode, setDrawer } from './v2-browser-ui-helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),executablePath=process.env.V2_CHROMIUM_EXECUTABLE;
if(!executablePath)throw new Error('Set V2_CHROMIUM_EXECUTABLE; never silently skip browser checks.');
const output=path.join(root,'dist','v2-nest-browser-check');await fs.mkdir(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--single-process','--no-zygote','--disable-gpu','--disable-gpu-compositing','--disable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const checks=[],errors=[];function check(value,label){assert(value,label);checks.push(label);}
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.httpServer.address().port}/v2.html`;await page.goto(url);
 // Controlled earned-resource fixture through the actual transactional storage boundary. Production never grants this.
 await page.evaluate(async()=>{const {createStoragePort}=await import('/src/v2/adapters/storage.js');const {loadContentCatalog}=await import('/src/v2/content/catalog.js');const {readProfileRepository,commitProfilePlan}=await import('/src/v2/application/repository.js');const port=createStoragePort('big-fat-fish:v2:profile'),catalog=loadContentCatalog(),record=await readProfileRepository(port,catalog);if(!record.ok)throw Error(record.message);const p=record.value.profile;const saved=await commitProfilePlan(port,{expectedRevision:p.revision,next:{...p,revision:p.revision+1,gpuCards:50,parts:30,discovered:[...p.discovered,'mcp_fan'],unlockedDsh:['dsh_claude_appeal','dsh_lora']},events:[]},catalog);if(!saved.ok)throw Error(saved.message);});await page.reload();
 await page.waitForFunction(()=>document.querySelector('#wallet').textContent.includes('算力卡 50'));await setDrawer(page, 'nest-panel', true);
 check(await page.locator('[data-tree-id]').count()===27,'The actual nest exposes all 27 permanent tree nodes');
 for(const id of ['tree_body_a','tree_body_b','tree_mcp_a','tree_mcp_b','tree_mcp_d','tree_dsh_a']){const button=page.locator(`[data-tree-id="${id}"] button`);if(id==='tree_dsh_a')await page.locator('#nest-manager details > summary').click();await button.click();await page.waitForFunction(id=>document.querySelector(`[data-tree-id="${id}"] button`)?.textContent==='已点亮',id);}
 check((await page.locator('.nest-balance').textContent()).includes('算力卡 33'),'Actual tree purchases deduct their exact costs once');
 await page.locator('[data-tab=facilities]').click();await page.locator('[data-facility-id=home_bench] button').click();await page.waitForFunction(()=>document.querySelector('[data-facility-id=home_bench] button').textContent==='已建成');check((await page.locator('.nest-balance').textContent()).includes('零件 24'),'Construction spends six real parts through the Profile transaction');
 await page.locator('[data-tab=gear]').click();await page.locator('[data-gear-id=mcp_fan] button').click();await page.waitForFunction(()=>document.querySelector('[data-gear-id=mcp_fan] button').textContent==='已解锁');check((await page.locator('.nest-balance').textContent()).includes('零件 18'),'Discovered fan MCP becomes a permanent departure choice for six parts');
 await page.locator('[data-loadout=weapon-0]').selectOption('mcp_fan');await page.locator('[data-loadout=weapon-1]').selectOption('mcp_bubble');
 await page.locator('[data-tab=dsh]').click();await page.locator('[data-dsh-id=dsh_claude_appeal] button').click();await page.waitForFunction(()=>document.querySelector('[data-dsh-id=dsh_claude_appeal] button').textContent==='卸下');check((await page.locator('#nest-manager').textContent()).includes('已装 1 件'),'A real unlocked DSH equips into a purchased slot');
 await page.screenshot({path:path.join(output,'nest-dsh.png'),fullPage:true});await setDrawer(page, 'nest-panel', false);await selectMode(page,'short');await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#hp-label').textContent==='110 / 110');check((await page.locator('#weapon-label').textContent()).includes('扇面'),'Departure actually uses the selected permanent MCP and tree HP');
 check(await page.locator('#nest-panel').isHidden(),'Permanent purchases are inaccessible during the active adventure');
 const checkpoint=await page.evaluate(async()=>{const {createStoragePort}=await import('/src/v2/adapters/storage.js');return (await createStoragePort('big-fat-fish:v2:profile').read()).value.profile.checkpoint;});
 check(checkpoint.state.start.treeNodeIds.length===6&&checkpoint.state.player.baseStats.armor===6,'The real initial checkpoint locks the six purchased nodes and derived armor');
 check(checkpoint.state.start.dsh[0].id==='dsh_claude_appeal'&&checkpoint.state.player.loadout.weapons.map(w=>w.definitionId).join(',')==='mcp_fan,mcp_bubble','The run locks DSH and the second-MCP departure loadout');
 await page.reload();await page.locator('#continue').click();await page.locator('#pause-menu').waitFor({state:'visible'});check((await page.locator('#hp-label').textContent())==='110 / 110','Reload restores tree-enhanced life without reapplying the initial bonus');
 await page.locator('#resume').click();await page.locator('#pause').click();await page.locator('#abandon').click();await page.locator('#restart:not([disabled])').waitFor();await page.locator('#restart').click();await setDrawer(page, 'nest-panel', true);await page.locator('[data-action=respec]').click();await page.waitForFunction(()=>document.querySelector('.nest-balance').textContent.includes('算力卡 50'));
 check((await page.locator('[data-tree-id] button').filter({hasText:'已点亮'}).count())===0,'Full respec refunds all 17 spent cards and clears the tree');
 await page.locator('[data-tab=dsh]').click();check((await page.locator('#nest-manager').textContent()).includes('已开放 0 / 3 槽，已装 0 件'),'Respec closes DSH slots and unequips while keeping the collection');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#wallet').textContent.includes('算力卡 50'));await setDrawer(page, 'nest-panel', true);await page.locator('[data-tab=gear]').click();check(await page.locator('[data-gear-id=mcp_fan] button').textContent()==='已解锁','Permanent equipment ownership survives abandon, respec and refresh');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'nest-mobile.png'),fullPage:true});check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'Nest content fits the phone width');const bounds=await page.locator('.nest-tabs button').first().boundingBox();check(bounds.height>=44,'Nest navigation meets the mobile touch floor');
 check(errors.length===0,`No browser errors: ${errors.join('; ')}`);const report={checks:checks.length,passed:checks,scope:'Controlled funded Profile fixture; no production resource grants or human balance claim'};await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
