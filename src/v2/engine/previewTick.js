// @ts-check
import{planCombatPluginWorld}from'../domain/combatPlugins.js';
import{planScheduledActions}from'../domain/scheduled.js';
import {planPartnerBanContact} from '../domain/companions.js';
import { planAbilityFields,planAbilityBursts,planAbilityHistory } from '../domain/abilities.js';
import { createEmptyPlan, createStateChange } from '../domain/plans.js';
import { planDistilledAbilities, planDistillEvent } from '../domain/distill.js';
import { planEventHooks } from './hooks.js';
import { planLoraUiStep } from '../domain/lora.js';
import {planPressureSchedule,planPressureEventAdvance} from '../domain/world/pressure.js';
import {planMechanicEvent} from '../domain/mechanics.js';
import {planGrokProjectiles} from '../domain/bosses/grok.js';
import {planGptReset} from '../domain/bosses/gpt.js';
import {planGptFields} from '../domain/gptPets.js';
import {planEasterAdvance} from '../domain/easter.js';
import {planDshEffects} from '../domain/dshEffects.js';
import { planDshCycleEvent } from '../domain/dshCycle.js';
import { planProgressionPanels } from './flow.js';
import { planStatusAdvance } from '../domain/status.js';
import { planMapExploration } from '../domain/world/map.js';
import { planSpawnSchedule } from '../domain/world/spawning.js';
import { planObjectiveAdvance } from '../domain/world/objectives.js';
import { planEnemyAi, planBossAi, planCompanionAi } from '../domain/ai.js';
import { planPlayerMovement, planEntityMotion, planPickupMotion } from '../domain/movement.js';
import { planWeaponFire, planCollisionEffects } from '../domain/attacks.js';
import { detectCollisions } from '../domain/collision.js';
import { planDeathRewards } from '../domain/rewards.js';
import { resolveTerminalOutcome } from '../domain/deaths.js';
import { orderPendingCommands, planGameCommand } from './commands.js';
import { applySystemPlan, commitWorkingState } from './reducer.js';
import { drainEffectQueue } from './effectLoop.js';
/** A bounded, explicit combat-only slice. Full adventure tick remains separate and unfinished.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/abilities.js#planAbilityBursts
 * @calls domain/abilities.js#planAbilityFields
 * @calls domain/abilities.js#planAbilityHistory
 * @calls domain/ai.js#planBossAi
 * @calls domain/ai.js#planCompanionAi
 * @calls domain/ai.js#planEnemyAi
 * @calls domain/attacks.js#planCollisionEffects
 * @calls domain/attacks.js#planWeaponFire
 * @calls domain/bosses/gpt.js#planGptReset
 * @calls domain/bosses/grok.js#planGrokProjectiles
 * @calls domain/collision.js#detectCollisions
 * @calls domain/combatPlugins.js#planCombatPluginWorld
 * @calls domain/companions.js#planPartnerBanContact
 * @calls domain/deaths.js#resolveTerminalOutcome
 * @calls domain/distill.js#planDistilledAbilities
 * @calls domain/dshCycle.js#planDshCycleEvent
 * @calls domain/dshEffects.js#planDshEffects
 * @calls domain/easter.js#planEasterAdvance
 * @calls domain/gptPets.js#planGptFields
 * @calls domain/mechanics.js#planMechanicEvent
 * @calls domain/movement.js#planEntityMotion
 * @calls domain/movement.js#planPickupMotion
 * @calls domain/movement.js#planPlayerMovement
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#planDeathRewards
 * @calls domain/scheduled.js#planScheduledActions
 * @calls domain/status.js#planStatusAdvance
 * @calls domain/world/map.js#planMapExploration
 * @calls domain/world/objectives.js#planObjectiveAdvance
 * @calls domain/world/pressure.js#planPressureEventAdvance
 * @calls domain/world/pressure.js#planPressureSchedule
 * @calls domain/world/spawning.js#planSpawnSchedule
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/commands.js#planGameCommand
 * @calls engine/effectLoop.js#drainEffectQueue
 * @calls engine/flow.js#planProgressionPanels
 * @calls engine/hooks.js#planEventHooks
 * @calls engine/reducer.js#applySystemPlan
 * @calls engine/reducer.js#commitWorkingState
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function advancePreviewWorldTick(state, commands, catalog) {
  if (!['core-preview', 'adventure-slice'].includes(String(state.start.runtimeProfile))) throw new Error('Not a combat preview');
  if (!['exploring', 'boss'].includes(state.flow.phase)) return { next: /** @type {import('../contracts.d.ts').GameState} */ (structuredClone(state)), events: [], persistence: [], diagnostics: [] };
  let working = /** @type {import('../contracts.d.ts').GameState} */ (structuredClone(state));
  working.tick++;
  const outbox = { events: /** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]), persistence: /** @type {import('../contracts.d.ts').PersistenceIntent[]} */ ([]), diagnostics: /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]) };
  const effects = /** @type {import('../contracts.d.ts').EffectRequest[]} */ ([]);
  const context = () => ({ state: working, catalog, event: null, entityId: null, random: working.random.combat });
  const apply = (/** @type {import('../contracts.d.ts').SystemPlan} */ plan) => { if (plan.changes.length) working = applySystemPlan(working, plan); effects.push(...plan.effects); outbox.events.push(...plan.events); outbox.persistence.push(...plan.persistence); outbox.diagnostics.push(...plan.diagnostics); for (const event of plan.events) { const hook = planEventHooks(context(), event); if (hook.changes.length) working = applySystemPlan(working, hook); effects.push(...hook.effects);outbox.events.push(...hook.events);outbox.persistence.push(...hook.persistence); } };
  for (const command of orderPendingCommands(commands, working.tick, 'world')) apply(planGameCommand(context(), command).plan);
  apply(planStatusAdvance(context()));
  apply(planDshCycleEvent(context(), { id: `world:${working.tick}`, runId: working.runId, tick: working.tick, seq: 0, type: 'WorldTick', sourceId: null, targetId: null, payload: {} }));
  apply(planMechanicEvent(context(),{id:`mechanics:${working.tick}`,runId:working.runId,tick:working.tick,seq:0,type:'WorldTick',sourceId:null,targetId:null,payload:{}}));
  apply(planPressureSchedule(context()));
  apply(planPressureEventAdvance(context()));
  apply(planSpawnSchedule(context()));
  apply(planGptFields(context()));
  apply(planEnemyAi(context()));
  apply(planBossAi(context()));
  apply(planCompanionAi(context()));
  apply(planAbilityFields(context()));
  apply(planPlayerMovement(context(), working.input));
  apply(planEntityMotion(context()));
  apply(planGrokProjectiles(context()));
  apply(planPartnerBanContact(context()));
  apply(planAbilityBursts(context()));
  apply(planCombatPluginWorld(context()));
  apply(planScheduledActions(context()));
  apply(planDshEffects(context(),{id:`idle:${working.tick}`,runId:working.runId,tick:working.tick,seq:0,type:'WorldTick',sourceId:null,targetId:null,payload:{}}));
  apply(planEasterAdvance(context()));
  apply(planMapExploration(context()));
  apply(planWeaponFire({ ...context(), aim: working.input.aim, weapon: working.player.loadout.weapons[working.player.loadout.activeWeaponIndex] }));
  apply(planDistilledAbilities(context()));
  apply(planCollisionEffects(context(), detectCollisions(context())));
  apply(planPickupMotion(context()));
  const drained = effects.length ? drainEffectQueue(context(), { pending: effects, processedIds: [], spawnedThisTick: 0 }) : { nextWorking: working, deaths: [], events: [], persistence: [], diagnostics: [], exhausted: false };
  working = drained.nextWorking; outbox.events.push(...drained.events); outbox.persistence.push(...drained.persistence); outbox.diagnostics.push(...drained.diagnostics);
  if (drained.exhausted) throw new Error('Combat preview effect queue exhausted; no partial frame was committed');
  for(const boss of working.bosses)if(boss.faction==='gpt')apply(planGptReset(context(),boss));
  apply(planDeathRewards(context(), drained.deaths).plan);
  apply(planAbilityHistory(context()));
  const outcome = resolveTerminalOutcome(context(), drained.deaths);
  if (outcome) apply({ ...createEmptyPlan(), changes: [createStateChange('flow', 'phase', 'setFlowPhase', { phase: outcome, resumePhase: null }), createStateChange('runtime', 'input', 'setInput', { ...working.input, move: { x: 0, y: 0 }, firing: false })] });
  if (!outcome) apply(planObjectiveAdvance(context()));
  if (!outcome) for (let i = 0; i < 128; i++) { const plan = planProgressionPanels(context()); if (!plan.changes.length) break; apply(plan); if (i === 127) throw new Error('Growth queue did not settle'); }
  return commitWorkingState(state, working, catalog, outbox);
}
/** Process pause/resume immediately without advancing the stopped UI/world clock.
 * @implementationScope core-preview
 * @calls domain/dshEffects.js#planDshEffects
 * @calls domain/lora.js#planLoraUiStep
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/commands.js#planGameCommand
 * @calls engine/flow.js#planProgressionPanels
 * @calls engine/reducer.js#applySystemPlan
 * @calls engine/reducer.js#commitWorkingState
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {boolean} advanceClock
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function advancePreviewUiCommands(state, commands, catalog, advanceClock = false) {
  let working = /** @type {import('../contracts.d.ts').GameState} */ (structuredClone(state));
  const due = orderPendingCommands(commands, state.uiTick, 'ui');
  const shouldAdvance = advanceClock && state.flow.phase === 'loraTraining' && state.lora.active?.phase === 'running';
  if (!due.length && !shouldAdvance) return { next: working, events: [], persistence: [], diagnostics: [] };
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const events = /** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]);
  for (const command of due) { const result = planGameCommand({ state: working, catalog, event: null, entityId: null, random: working.random.combat }, command); working = applySystemPlan(working, result.plan); diagnostics.push(...result.plan.diagnostics); events.push(...result.plan.events); }
  for(const event of events.filter(e=>e.type==='LifeRestored'))working=applySystemPlan(working,planDshEffects({state:working,catalog,event:null,entityId:null,random:working.random.combat},event));
  if (shouldAdvance && working.flow.phase === 'loraTraining' && working.lora.active?.id === state.lora.active?.id && working.lora.active?.phase === 'running') { working.uiTick++; const plan = planLoraUiStep({ state: working, catalog, random: working.random.lora, event: null, entityId: null }); working = applySystemPlan(working, plan); events.push(...plan.events); }
  for (let i = 0; i < 128; i++) { const plan = planProgressionPanels({ state: working, catalog, event: null, entityId: null, random: working.random.reward }); if (!plan.changes.length) break; working = applySystemPlan(working, plan); events.push(...plan.events); if (i === 127) throw new Error('Growth queue did not settle'); }
  return commitWorkingState(state, working, catalog, { events, persistence: [], diagnostics });
}
