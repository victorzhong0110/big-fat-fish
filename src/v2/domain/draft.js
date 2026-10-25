// @ts-check
/**
 * 候选、升级、换槽与一次性重抽。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import { createEmptyPlan, createStateChange } from './plans.js';
import { createHandlerRegistry } from '../content/registry.js';
import { advanceDistillTrack } from './distill.js';
import * as dependency2 from './random.js';

/**
 * 按权重生成3/DSH首轮4个互异候选，首组保底蒸馏。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/random.js#chooseWeightedIndex
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').LevelReward} reward
 * @returns {import('../contracts.d.ts').Result<{choice: import('../contracts.d.ts').PluginChoice; nextRandom: import('../contracts.d.ts').RandomState}>}
 */
export function createPluginChoice(context, reward) {
  const state = context.state;
  if (!['core-preview', 'adventure-slice'].includes(String(state.start.runtimeProfile))) throw new Error('Full draft pool is unfinished');
  let pool = createHandlerRegistry().implementedIds.filter(id=>context.catalog.definitions[id]?.kind==='plugin').filter(id => !state.plugins.some(plugin => plugin.id === id && plugin.rank === 2));
  const previous = state.flow.choice;
  const fresh = pool.filter(id => !previous?.candidates.some(candidate => candidate.id === id));
  let random = state.random.reward;
  const candidates = /** @type {{id:string;rank:1|2}[]} */ ([]);
  const add = (/** @type {string} */ id) => { candidates.push({ id, rank: state.plugins.some(plugin => plugin.id === id) ? 2 : 1 }); pool = pool.filter(item => item !== id); };
  if (reward.level === 2 && !previous && pool.includes('plugin_distill')) add('plugin_distill');
  const ordinal = [2, 4, 7, 10, 13, 16, 19, 22, 25, 28].filter(level => level <= reward.level).length;
  const weights = ordinal <= 2 ? [75, 23, 2] : ordinal <= 4 ? [50, 40, 10] : [30, 50, 20];
  while (pool.length && candidates.length < 3) {
    const preferred = previous && fresh.some(id => pool.includes(id)) ? pool.filter(id => fresh.includes(id)) : pool;
    const groups = ['common','advanced','legendary'].map(rarity=>preferred.filter(id=>context.catalog.definitions[id]?.parameters.rarity===rarity));
    const rarity = dependency2.chooseWeightedIndex(groups.map((group, i) => group.length ? weights[i] : 0), random);
    if (!rarity.ok) throw new Error(rarity.message); random = rarity.value.next;
    const group = groups[rarity.value.index], pick = dependency2.chooseWeightedIndex(group.map(() => 1), random);
    if (!pick.ok) throw new Error(pick.message); random = pick.value.next; add(group[pick.value.index]);
  }
  return { ok: true, value: { choice: { id: `${reward.id}:choice:${state.flow.pluginRerollsUsed ?? 0}`, level: reward.level, candidates, rerollsUsed: state.flow.pluginRerollsUsed ?? 0, replacingId: null, resolved: false }, nextRandom: random } };
}

/**
 * 校验choiceId/optionId，升级同id或确认满槽替换，Pro5h单独origin不占槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/distill.js#advanceDistillTrack
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPluginSelection(context, command) {
  const state = context.state, choice = state.flow.choice;
  const payload = /** @type {{choiceId?:string;optionId?:string;replaceId?:string}} */ (command.payload);
  const candidate = choice?.candidates.find(item => item.id === payload.optionId);
  if (state.flow.phase !== 'pluginChoice' || !choice || choice.resolved || choice.id !== payload.choiceId || !candidate) return createEmptyPlan();
  let plugins = [...state.plugins];
  const existing = plugins.find(plugin => plugin.id === candidate.id);
  if (existing?.rank === 2 || candidate.rank !== (existing ? 2 : 1)) return createEmptyPlan();
  if (!existing && plugins.filter(plugin => plugin.origin === 'run').length >= 6) {
    if (!plugins.some(plugin => plugin.id === payload.replaceId && plugin.origin === 'run')) return createEmptyPlan();
    plugins = plugins.filter(plugin => plugin.id !== payload.replaceId);
  }
  plugins = existing ? plugins.map(plugin => plugin.id === candidate.id ? { ...plugin, rank: candidate.rank } : plugin) : [...plugins, { id: candidate.id, rank: candidate.rank, origin: /** @type {const} */ ('run'), runtime: {} }];
  const changes = [createStateChange('progression', candidate.id, 'setPlugins', { plugins })];
  if (candidate.id === 'plugin_distill') for (const faction of /** @type {const} */ (['claude', 'gpt', 'grok'])) changes.push(createStateChange('progression', faction, 'setDistillTrack', advanceDistillTrack(state.distill[faction], 0, faction === 'grok' ? candidate.rank === 1 ? 10 : 7 : candidate.rank === 1 ? 6 : 4)));
  return { ...completeChoice(context), changes: [...changes, ...completeChoice(context).changes] };
}

/**
 * 消费本局有限重抽次数后重建候选，优先避开旧候选；不重复保底蒸馏。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/draft.js#createPluginChoice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPluginReroll(context, command) {
  const state = context.state, choice = state.flow.choice;
  const payload = /** @type {{choiceId?:string}} */ (command.payload);
  if (state.flow.phase !== 'pluginChoice' || !choice || choice.resolved || choice.id !== payload.choiceId || (state.flow.pluginRerollsUsed ?? 0) >= 1) return createEmptyPlan();
  const copy = { ...state, flow: { ...state.flow, pluginRerollsUsed: 1 } };
  const reward = state.flow.queuedLevelRewards[0]; if (!reward) return createEmptyPlan();
  const result = createPluginChoice({ ...context, state: copy }, reward); if (!result.ok) throw new Error(result.message);
  return { ...createEmptyPlan(), changes: [createStateChange('random', 'reward', 'setRandomStream', result.value.nextRandom), createStateChange('flow', 'growth', 'setGrowthFlow', { rewards: state.flow.queuedLevelRewards, choice: result.value.choice, rerollsUsed: 1 })] };
}

/**
 * 一次跳过治疗8并完成该选择，不转换永久资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPluginSkip(context, command) {
  const state = context.state, choice = state.flow.choice;
  if (state.flow.phase !== 'pluginChoice' || !choice || choice.resolved || choice.id !== /** @type {{choiceId?:string}} */ (command.payload)?.choiceId) return createEmptyPlan();
  const player = state.world.entities[state.player.entityId], plan = completeChoice(context);
  return { ...plan, changes: [...plan.changes, createStateChange('entity', player.id, 'setHp', { hp: Math.min(player.maxHp, player.hp + 8) })] };
}

/** @param {import('../contracts.d.ts').EvaluationContext} context @returns {import('../contracts.d.ts').SystemPlan} */
function completeChoice(context) {
 const state = context.state;
 return { ...createEmptyPlan(), changes: [createStateChange('flow', 'growth', 'setGrowthFlow', { rewards: state.flow.queuedLevelRewards.slice(1), choice: null, rerollsUsed: state.flow.pluginRerollsUsed ?? 0 }), createStateChange('flow', 'phase', 'setFlowPhase', { phase: 'preparing', resumePhase: state.flow.resumePhase ?? 'exploring' })] };
}
