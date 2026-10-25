import { resolveWeaponTemplate } from '../content/weaponCapabilities.js';
// @ts-check
import { isTreeSnapshotValid } from './treeRuntime.js';
import { serializeCanonical } from './serialization.js';
/**
 * Inspect plain GameState and cross-module invariants without modifying it.
 * Used by both the sole state committer and checkpoint validation.
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/treeRuntime.js#isTreeSnapshotValid
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function inspectGameState(state, catalog) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const reject = (/** @type {string} */ message, /** @type {string[]} */ relatedIds = []) => diagnostics.push({ code: 'INVALID_STATE', message, relatedIds });
  try {
    serializeCanonical(state);
    if (!state.runId || !Number.isSafeInteger(state.seed) || !Number.isSafeInteger(state.level) || state.level < 1 || !Number.isSafeInteger(state.totalTokens) || state.totalTokens < 0 || !Number.isSafeInteger(state.xpRemainder) || state.xpRemainder < 0) reject('Invalid run/progression');
    if (![state.processedRewardIds, state.processedCommandIds, state.attackHits, state.plugins, state.start.treeNodeIds, state.start.dsh, state.flow.queuedLevelRewards, state.lora.pendingLevels, state.lora.modifiers, state.lora.resolvedTrialIds, state.player.modifiers, state.player.loadout.weapons, state.world.objectives, state.world.spawnQueue, state.world.budgets, state.world.pressureEvents, state.pendingEffects.pending, state.pendingEffects.processedIds].every(Array.isArray)) reject('Missing state collections');
    if (!['preparing', 'exploring', 'boss', 'pluginChoice', 'loraTraining', 'paused', 'victory', 'defeat', 'withdrawal'].includes(state.flow.phase)) reject('Unknown game phase');
    if (!state.versions || !Number.isInteger(state.versions.schema) || !state.versions.core || state.versions.content !== catalog.version) reject('Invalid versions');
    if (!['tutorial', 'short', 'expedition', 'api'].includes(state.start.difficulty.mode)) reject('Invalid mode');
    if ((state.start.difficulty.mode === 'api') !== (state.start.difficulty.level === 'api') || (state.start.difficulty.mode === 'api') !== (state.api !== null)) reject('API mode mismatch');
    if (state.start.difficulty.level !== 'api' && (!Number.isInteger(state.start.difficulty.level) || state.start.difficulty.level < 0 || state.start.difficulty.level > 15)) reject('Invalid difficulty');
    for (const stream of ['world', 'reward', 'combat', 'dsh', 'lora', 'event']) {
      const random = state.random[/** @type {keyof import('../contracts.d.ts').RandomStreams} */ (stream)];
      if (!random || !Number.isInteger(random.seed) || random.seed < 0 || random.seed > 0xffffffff || !Number.isSafeInteger(random.cursor) || random.cursor < 0) reject('Invalid random stream');
    }
    if (state.lastWorldAdvanceTick !== null && (!Number.isSafeInteger(state.lastWorldAdvanceTick) || state.lastWorldAdvanceTick < 0 || state.lastWorldAdvanceTick > state.tick) || state.dshCycle.lastAdvancedTick !== null && (!Number.isSafeInteger(state.dshCycle.lastAdvancedTick) || state.dshCycle.lastAdvancedTick < 0 || state.dshCycle.lastAdvancedTick > state.tick)) reject('Invalid timer cursor');
    if (!Number.isSafeInteger(state.lastCommandSeq) || state.lastCommandSeq < -1 || !state.input || typeof state.input.firing !== 'boolean' || ![state.input.move.x, state.input.move.y, state.input.aim.x, state.input.aim.y].every(value => typeof value === 'number' && Number.isFinite(value)) || !Array.isArray(state.input.heldKeys) || !Array.isArray(state.input.pointerIds)) reject('Invalid input/command state');
    if (state.start.runtimeProfile === 'core-preview') {
      if (!state.start.runId || state.start.runId !== state.runId || state.start.difficulty.level !== 0 || state.start.difficulty.mode !== 'tutorial' || state.start.treeNodeIds.length || (state.start.dsh.length > 1 || state.start.dsh.some(slot => !['dsh_lora', 'dsh_gpt_branch'].includes(slot.id))) || state.plugins.some(plugin => !['plugin_collect', 'plugin_5h', 'plugin_guard', 'plugin_distill', 'plugin_compress', 'plugin_parallel'].includes(plugin.id)) || state.bosses.length || state.start.difficulty.mechanicIds.length || state.player.loadout.companionId !== null || state.player.loadout.weapons.some(weapon => resolveWeaponTemplate(catalog,weapon.definitionId) === null) || !['skill_cache', 'skill_disconnect'].includes(state.player.loadout.skillId) || Object.values(state.world.entities).some(entity => entity.kind === 'enemy' && !['enemy_claude_guard', 'enemy_grok_bot'].includes(entity.definitionId))) reject('Unsupported preview capability');
    }
    if (!Number.isInteger(state.flow.pluginRerollsUsed ?? 0) || (state.flow.pluginRerollsUsed ?? 0) < 0 || (state.flow.pluginRerollsUsed ?? 0) > 1) reject('Invalid whole-run reroll count');
    const rewards = state.flow.queuedLevelRewards;
    if (rewards.length > 1 || rewards.some(reward => reward.id !== `${state.runId}:level:${reward.level}` || reward.level !== state.level || typeof reward.loraRequired !== 'boolean' || typeof reward.pluginRequired !== 'boolean')) reject('Invalid level reward queue');
    const choice = state.flow.choice;
    if (state.flow.phase === 'pluginChoice' && (!choice || choice.resolved || choice.level !== rewards[0]?.level)) reject('Missing active plugin choice');
    if (choice && (!choice.id || choice.candidates.length > 4 || new Set(choice.candidates.map(item => item.id)).size !== choice.candidates.length || choice.candidates.some(item => catalog.definitions[item.id]?.kind !== 'plugin' || ![1, 2].includes(item.rank)))) reject('Invalid plugin candidates');
    for (const track of Object.values(state.distill)) if (!Number.isInteger(track.stage) || track.stage < 0 || track.stage > 3 || !Number.isSafeInteger(track.samples) || track.samples < 0 || track.stage === 3 && track.samples !== 0) reject('Invalid distillation track');
    if (Object.entries(state.distillRuntime ?? {}).some(([key, value]) => !['shieldReadyAt', 'shots', 'botReadyAt', 'bubbleReadyAt'].includes(key) || !Number.isSafeInteger(value) || Number(value) < 0)) reject('Invalid distillation timers');
    if(state.start.runtimeProfile==='adventure-slice'&&(state.start.difficulty.mode!=='short'||state.start.difficulty.level!==1||!isTreeSnapshotValid(state.start.treeNodeIds,catalog)||state.player.loadout.companionId!==null))reject('Unsupported adventure slice capability');
    if(new Set(state.world.objectives.map(item=>item.id)).size!==state.world.objectives.length||state.world.objectives.some(item=>!state.world.entities[item.id]||typeof item.active!=='boolean'||typeof item.completed!=='boolean'||!Number.isSafeInteger(item.progress)||item.progress<0||!Array.isArray(item.requiredEntityIds)||item.kind==='beacon'&&item.progress>2100))reject('Invalid world objective');
    if(new Set(state.bosses.map(item=>item.entityId)).size!==state.bosses.length||state.bosses.some(item=>!state.world.entities[item.entityId]||!['claude','gpt','grok'].includes(item.faction)||!Number.isInteger(item.phase)||item.phase<1))reject('Invalid boss record');
    if(new Set(state.world.spawnQueue.map(item=>item.id)).size!==state.world.spawnQueue.length||state.world.spawnQueue.some(item=>!Number.isSafeInteger(item.at)||item.at<0||!Number.isFinite(item.position.x)||!Number.isFinite(item.position.y)||catalog.definitions[item.enemyId]?.kind!=='enemy'||!state.world.budgets.some(budget=>budget.id===item.budgetId)))reject('Invalid spawn queue');
    if(new Set(state.world.budgets.map(item=>item.id)).size!==state.world.budgets.length||state.world.budgets.some(item=>![item.total,item.reserved,item.spawned,item.maxAlive].every(value=>Number.isSafeInteger(value)&&value>=0)||item.reserved+item.spawned>item.total||state.world.spawnQueue.filter(request=>request.budgetId===item.id).length!==item.reserved))reject('Invalid encounter budget');
    if(state.start.runtimeProfile==='adventure-slice'&&(!Number.isSafeInteger(state.spawnDirectorNextAt)||Number(state.spawnDirectorNextAt)<0||state.plugins.some(plugin=>!['plugin_collect','plugin_guard','plugin_5h','plugin_distill','plugin_compress','plugin_parallel'].includes(plugin.id))||state.start.dsh.some(slot=>!['dsh_lora','dsh_gpt_branch','dsh_claude_appeal','dsh_claude_allowlist'].includes(slot.id))||state.start.dsh.length>3||state.player.loadout.weapons.some(weapon=>resolveWeaponTemplate(catalog,weapon.definitionId) === null)||Object.values(state.world.entities).some(entity=>entity.kind==='enemy'&&!['enemy_claude_guard','enemy_grok_bot','boss_claude','claude_seal'].includes(entity.definitionId))))reject('Unsupported slice content');
    if(state.input.viewport&&(![state.input.viewport.width,state.input.viewport.height].every(Number.isFinite)||state.input.viewport.width<=0||state.input.viewport.height<=0))reject('Invalid camera bounds');
    if (new Set(state.start.dsh.map(slot=>slot.id)).size!==state.start.dsh.length || state.start.runtimeProfile==='adventure-slice' && state.start.dsh.length>state.start.treeNodeIds.filter(id=>['tree_dsh_a','tree_dsh_b','tree_dsh_c'].includes(id)).length || state.start.dsh.some(slot=>!slot.options || Object.values(slot.options).some(value=>typeof value!=='string') || slot.id==='dsh_claude_allowlist'&&!['skillBan','companionBan'].includes(slot.options.protect))) reject('Invalid departure DSH slots');
    const treeRuntime=state.world.entities[state.player.entityId]?.runtime;
    if (treeRuntime) {
      for (const key of ['treeReviveUsed','treeMealUsed','treeEmergencyUsed','treeSwitchShot']) if (treeRuntime[key]!==undefined && typeof treeRuntime[key]!=='boolean') reject('Invalid tree usage flag');
      for (const key of ['lastHpDamageAt','treeSwitchReadyAt','treeHotSwapReadyAt']) if (treeRuntime[key]!==undefined && (!Number.isSafeInteger(treeRuntime[key]) || Number(treeRuntime[key])<0 || key==='lastHpDamageAt'&&Number(treeRuntime[key])>state.tick)) reject('Invalid tree timer');
    }
    const stats = state.player.baseStats;
    if (!['maxHp', 'moveSpeed', 'armor', 'damageMultiplier', 'critChance', 'critMultiplier'].every(key => typeof stats[/** @type {keyof import('../contracts.d.ts').BaseStats} */ (key)] === 'number') || stats.maxHp <= 0 || stats.moveSpeed <= 0 || stats.armor < 0 || stats.damageMultiplier <= 0 || stats.critChance < 0 || stats.critMultiplier < 1) reject('Invalid base stats');
    if (serializeCanonical(state.start.modLock ?? []) !== serializeCanonical(catalog.modLock ?? [])) reject('Run mod lock differs from installed catalog');
    if (catalog.modLock?.length && state.start.runtimeProfile !== 'core-preview') reject('Modded permanent adventure is not enabled');
    const loadout = state.player.loadout;
    if (loadout.weapons.length < 1 || loadout.weapons.length > 2 || !Number.isInteger(loadout.activeWeaponIndex) || loadout.activeWeaponIndex < 0 || loadout.activeWeaponIndex >= loadout.weapons.length || [loadout.skillCooldown, loadout.companionCooldown, loadout.dashCooldown].some(value => value < 0)) reject('Invalid loadout');
    if (loadout.weapons.some(weapon => !weapon.instanceId || !catalog.definitions[weapon.definitionId] || ![0, 1, 2].includes(weapon.originalQuality) || weapon.cooldown < 0)) reject('Invalid weapon');
    if ([state.inventory.gpuFragments, state.inventory.parts, state.lora.underfitRemaining, state.lora.overfitRemaining, state.player.invulnerableRemaining, state.player.controlImmuneRemaining, state.dshCycle.remaining, state.dshCycle.triggerSeq].some(value => typeof value !== 'number' || value < 0)) reject('Invalid runtime counters');
    if (!Number.isInteger(state.world.map.biomeIndex) || state.world.map.width <= 0 || state.world.map.height <= 0) reject('Invalid map');
    for (const faction of ['claude', 'gpt', 'grok']) {
      const track = state.distill[/** @type {import('../contracts.d.ts').Faction} */ (faction)];
      if (!track || !Number.isInteger(track.stage) || track.stage < 0 || track.stage > 3 || !Number.isInteger(track.samples) || track.samples < 0) reject('Invalid distillation');
    }
    if (!Number.isSafeInteger(state.tick) || state.tick < 0 || !Number.isSafeInteger(state.uiTick) || state.uiTick < 0 || !Number.isSafeInteger(state.revision) || state.revision < 0) reject('Invalid state clock or revision');
    const player = state.world.entities[state.player.entityId];
    if (!player || player.kind !== 'player') reject('Missing player entity');
    if (new Set(state.plugins.map(plugin => plugin.id)).size !== state.plugins.length || state.plugins.filter(plugin => plugin.origin === 'run').length > 6) reject('Invalid plugin slots');
    if (state.plugins.some(plugin => ![1, 2].includes(plugin.rank))) reject('Invalid plugin rank');
    for (const [id, shield] of Object.entries(state.world.shields)) if (shield.id !== id || !shield.sourceId || typeof shield.amount !== 'number' || shield.amount < 0 || !Number.isSafeInteger(shield.expiresAt) || shield.expiresAt < 0 || !Number.isSafeInteger(shield.seq)) reject('Invalid shield', [id]);
    for (const [id, status] of Object.entries(state.world.statuses)) if (status.id !== id || !status.sourceId || typeof status.remaining !== 'number' || status.remaining < 0 || !Number.isInteger(status.requiredInputs) || status.requiredInputs < 0 || !Number.isInteger(status.completedInputs) || status.completedInputs < 0 || !Array.isArray(status.modifiersApplied)) reject('Invalid status', [id]);
    for (const [id, entity] of Object.entries(state.world.entities)) {
      if (!['player', 'enemy', 'companion', 'projectile', 'pickup', 'obstacle', 'objective', 'decoy'].includes(entity.kind) || !['player', 'enemy', 'neutral'].includes(entity.team)) reject('Invalid entity kind/team', [id]);
      if (![entity.radius, entity.hp, entity.maxHp, entity.armor, entity.facingRadians, entity.position.x, entity.position.y, entity.previousPosition.x, entity.previousPosition.y, entity.velocity.x, entity.velocity.y].every(value => typeof value === 'number' && Number.isFinite(value))) reject('Invalid entity geometry/stats', [id]);
      if (entity.hp === 0 && !entity.dead && ['player', 'enemy', 'decoy'].includes(entity.kind)) reject('Unsettled death at commit boundary', [id]);
      if (id !== entity.id || entity.radius < 0 || entity.hp < 0 || entity.maxHp <= 0 || entity.hp > entity.maxHp || !entity.sourceId) reject('Invalid entity', [id]);
      if (entity.dead && (!entity.dying || entity.hp !== 0)) reject('Invalid dead entity', [id]);
      if (!Object.hasOwn(catalog.definitions, entity.definitionId)) reject('Unknown entity definition', [id]);
      if(entity.kind==='projectile'&&entity.runtime.returnPhase!==undefined){
        const origin=/** @type {{x?:number;y?:number}|undefined} */(entity.runtime.returnOrigin);
        if(!['outbound','turnPending','returning'].includes(String(entity.runtime.returnPhase))||!origin||![origin.x,origin.y,entity.runtime.speed,entity.runtime.returnDistance,entity.runtime.returnMaxDistance].every(value=>typeof value==='number'&&Number.isFinite(value))||Number(entity.runtime.speed)<=0||Number(entity.runtime.returnDistance)<=0||Number(entity.runtime.returnMaxDistance)<Number(entity.runtime.returnDistance)||entity.runtime.returnPhase==='returning'&&entity.attackId!==`${entity.id}:return`)reject('Invalid saved returning projectile',[id]);
      }
      if(entity.kind==='projectile'&&entity.runtime.blastDamage!==undefined&&(!Number.isFinite(entity.runtime.blastDamage)||Number(entity.runtime.blastDamage)<0||!Number.isFinite(entity.runtime.blastRadius)||Number(entity.runtime.blastRadius)<=0))reject('Invalid saved explosive projectile',[id]);
      if (entity.shell && (entity.shell.hp < 0 || entity.shell.hp > entity.shell.maxHp || entity.shell.broken && entity.shell.hp !== 0 || entity.shell.enraged && !entity.shell.broken)) reject('Invalid shell', [id]);
      if (entity.shieldIds.some(shieldId => !state.world.shields[shieldId]) || entity.statusIds.some(statusId => !state.world.statuses[statusId])) reject('Dangling shield/status', [id]);
    }
    if (state.attackHits.some(hit => !hit.attackId || !state.world.entities[hit.targetId] || !Number.isSafeInteger(hit.expiresAt))) reject('Invalid hit ledger');
    for (const entries of Object.values(state.damageBudgets)) if (entries.some(entry => !Number.isSafeInteger(entry.tick) || entry.tick < 0 || entry.tick > state.tick || entry.spent < 0)) reject('Invalid damage ledger');
    const instances=new Set(state.player.loadout.weapons.map(weapon=>weapon.instanceId));
    for(const [id,pickup]of Object.entries(state.world.pickups)){
      if(pickup.id!==id||!['riceXp','gpuFragment','part','weapon','skill'].includes(pickup.kind)||!Number.isFinite(pickup.amount)||pickup.amount<0||![pickup.position.x,pickup.position.y].every(Number.isFinite)||typeof pickup.collected!=='boolean')reject('Invalid pickup',[id]);
      if(pickup.kind==='weapon'){
        const weapon=pickup.weapon;if(!weapon||pickup.instanceId!==weapon.instanceId||instances.has(weapon.instanceId)||!resolveWeaponTemplate(catalog,weapon.definitionId)||![0,1,2].includes(weapon.originalQuality)||!Number.isFinite(weapon.cooldown)||weapon.cooldown<0||weapon.temporaryQuality!==null&&![0,1,2].includes(weapon.temporaryQuality)||weapon.updateExpiresAt!==null&&(!Number.isSafeInteger(weapon.updateExpiresAt)||weapon.updateExpiresAt<0))reject('Invalid ground weapon instance',[id]);
        if(weapon)instances.add(weapon.instanceId);
      }
    }
    const d = state.start.difficulty.level === 'api' ? 15 : state.start.difficulty.level;
    const expected = catalog.mechanics.filter(mechanic => mechanic.unlockAt >= 1 && mechanic.unlockAt <= d).map(mechanic => mechanic.id).sort();
    if (JSON.stringify([...state.start.difficulty.mechanicIds].sort()) !== JSON.stringify(expected)) reject('Difficulty mechanism set differs from cumulative catalog');
  } catch { reject('Malformed state structure'); }
  return { valid: diagnostics.length === 0, diagnostics };
}
