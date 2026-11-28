import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { loadContentCatalog } from '../src/v2/content/catalog.js';
import { RESET_ACHIEVEMENT } from '../src/v2/content/achievements.js';
import { createDefaultProfile } from '../src/v2/domain/settlement.js';
import { createCheckpoint } from '../src/v2/domain/checkpoint.js';
import { prepareAdventureStart } from '../src/v2/application/nest.js';
import { createGameSession, disposeGameSession, readSessionState } from '../src/v2/engine/session.js';

const catalog = loadContentCatalog();
const output = 'dist/v2-desktop-cards-check';
const executablePath = process.env.V2_CHROMIUM_EXECUTABLE;
if (!executablePath) throw Error('Set V2_CHROMIUM_EXECUTABLE to run the desktop checks.');
await mkdir(output, {recursive:true});

function fixture(profile, runId, seed) {
  const start = prepareAdventureStart(profile, {
    mode:'short', difficulty:1, seed, weaponIds:['mcp_bubble'], skillId:'skill_disconnect', companionId:'companion_rice'
  }, catalog, runId);
  assert(start.ok, start.message);
  const session = createGameSession(start.value, seed, catalog);
  const state = readSessionState(session);
  disposeGameSession(session);
  return state;
}

async function installProfile(page, profile) {
  await page.evaluate(async profile => {
    const { createStoragePort } = await import('/src/v2/adapters/storage.js');
    const { loadContentCatalog } = await import('/src/v2/content/catalog.js');
    const { readProfileRepository, commitProfilePlan } = await import('/src/v2/application/repository.js');
    const port = createStoragePort('big-fat-fish:v2:profile'), catalog = loadContentCatalog();
    const record = await readProfileRepository(port, catalog);
    if (!record.ok) throw Error(record.message);
    const revision = record.value.revision;
    const result = await commitProfilePlan(port, {expectedRevision:revision, next:{...profile, revision:revision+1}, events:[]}, catalog);
    if (!result.ok) throw Error(result.message);
  }, profile);
  await page.reload();
}

async function commitEvents(page, intents) {
  return page.evaluate(async intents => {
    const { createStoragePort } = await import('/src/v2/adapters/storage.js');
    const { loadContentCatalog } = await import('/src/v2/content/catalog.js');
    const { readProfileRepository, commitProfilePlan, mergePersistenceIntents } = await import('/src/v2/application/repository.js');
    const port = createStoragePort('big-fat-fish:v2:profile'), catalog = loadContentCatalog();
    const record = await readProfileRepository(port, catalog);
    if (!record.ok) throw Error(record.message);
    const plan = mergePersistenceIntents(record.value.profile, intents, catalog);
    if (!plan.ok) throw Error(plan.message);
    const saved = await commitProfilePlan(port, plan.value, catalog);
    if (!saved.ok) throw Error(saved.message);
    return saved.value.profile;
  }, intents);
}

async function checkWheel(page) {
  await installProfile(page, {...createDefaultProfile(), highestDifficulty:10, unlockLedger:['endlessClear:4']});
  await page.locator('#open-departure').click();
  const wheel = page.locator('#benchmark-list');
  await wheel.focus();
  for (let i=0; i<10; i++) await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#bench-title').innerText(), 'Benchmark 11');
  assert.equal(await page.locator('#bench-affixes li').count(), 2);
  assert.match(await page.locator('#bench-affixes').innerText(), /Project Glasswing/);
  assert.match(await page.locator('#bench-models').innerText(), /GPT Astra · Claude Opus/);
  await page.locator('#stage-cast').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a => a.finished)));
  await page.screenshot({path:output+'/benchmark.png'});
  await page.locator('#mode-exploration').click();
  await wheel.focus();
  await page.keyboard.press('Home');
  for (let i=0; i<3; i++) await page.keyboard.press('ArrowUp');
  assert.match(await page.locator('#bench-reward').innerText(), /宝箱与目标掉落 ×1\.3/);
  assert(await page.locator('#start').isEnabled());
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#start').innerText(), '通关无尽 5 后解锁');
  assert.equal(await page.locator('#bench-affixes').innerText(), '？');
  await page.locator('#mode-short').click();
  await installProfile(page, {...createDefaultProfile(), highestDifficulty:15, apiUnlocked:true});
  await page.locator('#open-departure').click();
  await wheel.focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('#bench-title').innerText(), 'API 调用');
  const apiNames = await page.locator('#bench-models').innerText();
  for (const id of ['gpt_terra','claude_fable','claude_mythos','grok_bot']) {
    assert(apiNames.includes(catalog.definitions[id].displayName));
  }
  await page.locator('#mode-tower').click();
  assert.equal(await page.locator('.bench-row[data-benchmark=api]').count(), 0);
  await page.locator('#mode-short').click();
  console.log('Wheel: B11 lists both mechanics, B4 exploration pays ×1.3, B5 stays locked; API shows the model pool and stays off Endless.');
}

async function checkPrizes(page) {
  const profile = createDefaultProfile();
  profile.purchasedTree = ['tree_dsh_a'];
  profile.unlockedDsh = ['dsh_gpt_preview'];
  profile.equippedDsh = [{id:'dsh_gpt_preview', options:{}}];
  async function showDraw(seed) {
    const state = fixture(profile, 'cards:prizes', seed);
    state.world.pickups.rice = {id:'rice',kind:'riceXp',amount:120,position:{...state.world.entities.fish.position},collected:false,instanceId:null};
    await installProfile(page, {...profile, checkpoint:createCheckpoint(state)});
    await page.locator('#continue').click();
    await page.locator('#resume').click();
    await page.locator('#plugin-options .prize-button').nth(3).waitFor();
  }
  await showDraw(7);
  const options = page.locator('#plugin-options .prize-button');
  await options.nth(3).waitFor();
  const visible = await options.evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect();
    return button.contains(document.elementFromPoint(box.x + box.width/2, box.y + box.height/2));
  }));
  assert.deepEqual(visible, [true,true,true,true]);
  const fourth = options.nth(3);
  assert.equal(await fourth.getAttribute('data-plugin-id'), 'plugin_backoff');
  await fourth.click();
  const upgrade = page.locator('[data-plugin-id=plugin_backoff]');
  await upgrade.getByText('指数退避 · 2级').waitFor();
  assert.equal(await upgrade.locator('small').innerText(), catalog.definitions.plugin_backoff.parameters.rankDescriptions[1]);
  await upgrade.click();
  await page.waitForFunction(() => document.querySelector('#plugins-label').textContent.includes('指数退避2'));
  await showDraw(28);
  const ids = () => options.evaluateAll(buttons => buttons.map(button => button.dataset.pluginId));
  const original = await ids();
  assert.equal(await options.evaluateAll(buttons => new Set(buttons.map(button => button.dataset.rarity)).size), 3);
  const lamps = page.locator('.prize-lamps');
  await lamps.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  await page.mouse.move(2, 2);
  await page.screenshot({path:output+'/prizes.png'});
  await page.locator('#plugin-reroll').click();
  await page.waitForFunction(() => document.querySelector('#plugin-reroll').disabled);
  assert.equal(await options.count(), 4);
  assert.notDeepEqual(await ids(), original);

  await showDraw(28);
  // Stop the lamp halfway through its sweep to test hit targets without depending on machine speed.
  await lamps.evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause();
    animation.currentTime = Number(animation.effect.getTiming().duration) / 2;
  });
  await page.locator('.prize-button[data-rarity=legendary]').click();
  await page.getByText('Lv.4 · 选择插件', {exact:true}).waitFor();
  console.log('Prizes: four hit targets, fourth pick upgrades in place, one reroll and immediate input during celebration.');
}

function discovery(runId, definitionId) {
  const id = `discovery:${runId}:${definitionId}`;
  return {id, kind:'discovery', payload:{id,runId,tick:1,seq:0,type:'ContentDiscovered',sourceId:'fish',targetId:null,payload:{definitionId}}};
}

async function checkReceipt(page, neighbor, url) {
  const runId = 'cards:receipt';
  const profile = createDefaultProfile(), state = fixture(profile, runId, 19);
  state.inventory = {gpuFragments:13, parts:7};
  const checkpoint = createCheckpoint(state);
  await installProfile(page, profile);
  const award = {id:'rare-reset',runId,tick:1,seq:0,type:'DshCycleDurationReset',sourceId:'dsh_gpt_branch',targetId:null,
    payload:{achievementId:RESET_ACHIEVEMENT.id, mode:'short',activeRemaining:300,durationResets:1}};
  await commitEvents(page, [discovery(runId, 'mcp_fan'), {id:award.id, kind:'unlock', payload:award},
    {id:checkpoint.id, kind:'checkpoint', payload:checkpoint}]);
  await page.reload();
  await page.locator('#continue').click();
  await page.locator('#abandon').waitFor();
  await neighbor.goto(url);
  await commitEvents(neighbor, [discovery('cards:neighbor','mcp_fan'),discovery('cards:neighbor','mcp_vector')]);
  await page.bringToFront();
  await page.evaluate(runId => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(record, key) {
      if (record.profile?.settlementLedger.includes('settlement:'+runId)) {
        IDBObjectStore.prototype.put = put;
        this.transaction.abort();
        return;
      }
      return put.call(this, record, key);
    };
  }, runId);
  await page.locator('#abandon').click();
  await page.locator('#retry-profile').waitFor();
  assert(await page.locator('#receipt-stamp').isHidden());
  assert(await page.locator('#loot-card').isHidden());
  await page.locator('#retry-profile').click();
  await page.locator('#restart:not([disabled])').waitFor();
  assert.deepEqual(await page.locator('#receipt-names li').allTextContents(), [catalog.definitions.mcp_fan.displayName, RESET_ACHIEVEMENT.name]);
  assert.deepEqual(await page.locator('#loot-card b').allTextContents(), ['5','2','1']);
  assert(!((await page.locator('#toast').textContent()) ?? '').includes('尚未保存'));
  const saved = await commitEvents(neighbor, []);
  assert.equal(saved.settlementLedger.filter(id => id === 'settlement:'+runId).length, 1);
  assert.deepEqual([saved.gpuCards,saved.gpuFragments,saved.parts],[1,0,2]);
  const duplicate = {id:'settlement:'+runId,runId,outcome:'defeat',gpuFragments:13,parts:7,bossKills:0,survivedTicks:0,discoveries:[],difficulty:1,mode:'short'};
  const retried = await commitEvents(neighbor, [{id:duplicate.id,kind:'settlement',payload:duplicate}]);
  assert.deepEqual(retried, saved);
  await page.locator('.receipt .pause-card').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  await page.screenshot({path:output+'/receipt.png'});
  console.log('Receipt: restore, competing window, rejected write, explicit retry and duplicate settlement preserve the original stamps and payment.');
}

const server = await createServer({server:{host:'127.0.0.1',port:0,hmr:false,watch:null}});
await server.listen();
const browser = await chromium.launch({executablePath,args:['--no-sandbox','--disable-gpu']});
try {
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage(), neighbor = await context.newPage(), errors = [];
  for (const tab of [page, neighbor]) tab.on('pageerror', error => errors.push(error.message));
  const url = 'http://127.0.0.1:'+server.httpServer.address().port+'/v2.html';
  await page.goto(url);
  await checkWheel(page);
  await checkPrizes(page);
  await checkReceipt(page, neighbor, url);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
