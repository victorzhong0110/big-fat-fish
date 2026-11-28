// @ts-check
/**
 * 每次升级的独立UI计时与一次训练判定。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './random.js';
import { derivePlayerStats } from './stats.js';

export const LORA_TIMING = Object.freeze({ ticks: 120, perfectStart: 0.42, perfectEnd: 0.58 });

/**
 * 装配DSH后为实际新等级建立trial队列，不对初始1级训练。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planLoraLevel(context, event) {
  const state = context.state;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  if (!state.start.dsh.some(slot => slot.id === 'dsh_lora') || event.type !== 'LevelGained' || event.runId !== state.runId || !['exploring', 'boss', 'preparing', 'loraTraining', 'pluginChoice'].includes(state.flow.phase)) return empty;
  const payload = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (event.payload);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Number.isSafeInteger(payload.level)) return empty;
  const level = Number(payload.level), id = `lora:${state.runId}:${level}`;
  if (level < 2 || level > state.level || state.lora.pendingLevels.includes(level) || state.lora.active?.level === level || state.lora.resolvedTrialIds.includes(id)) return empty;
  return { ...empty, changes: [{ target: 'runtime', id: 'dsh_lora', operation: 'queueLoraLevel', payload: { level } }] };
}

/**
 * 选择训练目标并冻结其收益/代价，显示准备页，首按仅开始。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#chooseWeightedIndex
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {number} level
 * @returns {import('../contracts.d.ts').LoraTrialCreation}
 */
export function createLoraTrial(context, level) {
  if (!Number.isSafeInteger(level) || level < 2 || level > context.state.level) throw new RangeError('Invalid LoRA level');
  const result = dependency1.chooseWeightedIndex([1, 1, 1, 1], context.state.random.lora);
  if (!result.ok) throw new Error(result.message);
  const targets = /** @type {const} */ (['maxHp', 'damageMultiplier', 'moveSpeed', 'armor']);
  return { trial: { id: `lora:${context.state.runId}:${level}`, level, target: targets[result.value.index], phase: 'ready', uiTick: 0, result: null }, nextRandom: result.value.next };
}

/**
 * 仅在训练运行态推进固定UI时钟，指针左→右2秒，超时过拟合。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/lora.js#planLoraOutcome
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planLoraUiStep(context) {
  const active = context.state.lora.active;
  if (context.state.flow.phase !== 'loraTraining' || active?.phase !== 'running') return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const trial = { ...active, uiTick: Math.min(LORA_TIMING.ticks, active.uiTick + 1) };
  if (trial.uiTick >= LORA_TIMING.ticks) return planLoraOutcome(context, { ...trial, phase: 'resolved', result: 'overfit' });
  return { changes: [{ target: 'runtime', id: 'dsh_lora', operation: 'advanceLoraTrial', payload: { uiTick: trial.uiTick } }], effects: [], events: [], persistence: [], diagnostics: [] };
}

/**
 * 处理StartTraining/ConfirmTraining边沿；左右/完美区边界判定唯一。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/lora.js#planLoraOutcome
 * @calls domain/lora.js#resolveLoraOutcome
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planLoraInput(context, command) {
  const state = context.state, active = state.lora.active;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const payload = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (command.payload);
  if (command.type === 'ReleaseTraining' && ['loraTraining', 'paused'].includes(state.flow.phase) && active && command.clock === 'ui' && payload?.edge === 'release') return { ...empty, changes: [{ target: 'runtime', id: 'dsh_lora', operation: 'setLoraInputHeld', payload: { held: false } }] };
  if (state.lora.inputHeld) return empty;
  if (state.flow.phase !== 'loraTraining' || !active || command.clock !== 'ui' || command.targetTick > state.uiTick || state.processedCommandIds.includes(command.id) || !payload || typeof payload !== 'object' || Array.isArray(payload) || payload.edge !== 'press' || payload.repeat === true) return empty;
  let plan;
  if (command.type === 'StartTraining' && active.phase === 'ready') plan = { ...empty, changes: [{ target: /** @type {const} */ ('runtime'), id: 'dsh_lora', operation: 'startLoraPointer', payload: {} }] };
  else if (command.type === 'ConfirmTraining' && active.phase === 'running') plan = planLoraOutcome(context, { ...active, phase: 'resolved', result: resolveLoraOutcome(active) });
  else return empty;
  return { ...plan, changes: [...plan.changes, { target: 'runtime', id: 'dsh_lora', operation: 'setLoraInputHeld', payload: { held: true } }, { target: 'runtime', id: command.id, operation: 'registerCommand', payload: {} }] };
}

/**
 * 归一化[0.42,0.58]完美，左欠拟合，右/超时过拟合。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').LoraTrial} trial
 * @returns {'perfect' | 'underfit' | 'overfit'}
 */
export function resolveLoraOutcome(trial) {
  if (!Number.isSafeInteger(trial.uiTick) || trial.uiTick < 0) throw new RangeError('Invalid LoRA tick');
  const position = trial.uiTick / LORA_TIMING.ticks;
  return position < LORA_TIMING.perfectStart ? 'underfit' : position <= LORA_TIMING.perfectEnd ? 'perfect' : 'overfit';
}

/**
 * 按trialId只改本局指定基础属性一次，并挂对应负面；同类刷新不叠乘。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/lora.js#resolveLoraOutcome
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').LoraTrial} trial
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planLoraOutcome(context, trial) {
  const state = context.state;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const active = state.lora.active;
  if (state.flow.phase !== 'loraTraining' || !active || active.id !== trial.id || active.level !== trial.level || active.target !== trial.target || trial.phase !== 'resolved' || !trial.result || state.lora.resolvedTrialIds.includes(trial.id)) return empty;
  if (active.phase !== 'running' || trial.uiTick !== active.uiTick && !(active.uiTick === 119 && trial.uiTick === 120 && trial.result === 'overfit')) throw new Error('LoRA pointer does not match active trial');
  // Recompute result, do not trust the supplied reward label.
  if (resolveLoraOutcome(trial) !== trial.result) throw new Error('LoRA result does not match pointer');
  const perfect = trial.result === 'perfect';
  const speed = state.player.baseStats.moveSpeed;
  const parameters = {
    maxHp: { delta: perfect ? 3 : -2, min: -20, max: 30 },
    damageMultiplier: { delta: perfect ? 0.02 : -0.01, min: -0.1, max: 0.2 },
    moveSpeed: { delta: speed * (perfect ? 0.01 : -0.005), min: speed * -0.05, max: speed * 0.1 },
    armor: { delta: perfect ? 1 : -1, min: -5, max: 10 },
  }[trial.target];
  const id = `lora:stat:${trial.target}`;
  const previous = state.lora.modifiers.find(modifier => modifier.id === id)?.value ?? 0;
  const value = Math.max(parameters.min, Math.min(parameters.max, previous + parameters.delta));
  const modifier = { id, sourceId: 'dsh_lora', stat: trial.target, operation: /** @type {const} */ ('add'), value, expiresAt: null };
  const modifiers = [...state.lora.modifiers.filter(item => item.id !== id), modifier];
  const stats = derivePlayerStats({ ...state, lora: { ...state.lora, modifiers } }, context.catalog);
  return { changes: [{ target: 'runtime', id: 'dsh_lora', operation: 'applyLoraOutcome', payload: { trialId: trial.id, level: trial.level, result: trial.result, modifier: { ...modifier }, maxHp: stats.maxHp } }], effects: [], persistence: [], diagnostics: [],
    events: [{ id: `training:${trial.id}`, runId: state.runId, tick: state.tick, seq: 0, type: 'LoraResolved', sourceId: 'dsh_lora', targetId: state.player.entityId, payload: { trialId: trial.id, result: trial.result, stat: trial.target, actualDelta: value - previous } }],
  };
}
