// @ts-check
import { serializeCanonical } from '../domain/serialization.js';
import { createEmptyPlan, createStateChange } from '../domain/plans.js';
import { normalizeVector } from '../domain/geometry.js';
/**
 * 用户/系统命令校验与分派。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/attacks.js';
import * as dependency2 from '../domain/draft.js';
import * as dependency3 from '../domain/lora.js';
import * as dependency4 from '../domain/status.js';
import * as dependency5 from '../domain/world/map.js';
import * as dependency6 from './flow.js';

/**
 * 校验幂等id/seq/tick、状态、choiceId、资源和参数合法性。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateGameCommand(state, command) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  try { serializeCanonical(command); } catch { return { valid: false, diagnostics: [{ code: 'INVALID_COMMAND', message: 'Non-plain command', relatedIds: [] }] }; }
  const terminal = ['victory', 'defeat', 'withdrawal'].includes(state.flow.phase);
  if (typeof command.id !== 'string' || !command.id || typeof command.type !== 'string' || !Number.isSafeInteger(command.seq) || command.seq < 0 || command.seq <= state.lastCommandSeq || !Number.isSafeInteger(command.targetTick) || command.targetTick < 0 || !['world', 'ui'].includes(command.clock) || state.processedCommandIds.includes(command.id) || terminal) diagnostics.push({ code: 'INVALID_COMMAND', message: 'Invalid, stale or terminal command', relatedIds: [command.id] });
  const ui = ['Pause', 'Resume'].includes(command.type);
  if (ui && command.clock !== 'ui' || !ui && command.clock !== 'world') diagnostics.push({ code: 'WRONG_CLOCK', message: 'Command is in the wrong clock domain', relatedIds: [command.id] });
  if (!['SetInput', 'Pause', 'Resume', 'Dash', 'Skill', 'SwitchWeapon'].includes(command.type)) diagnostics.push({ code: 'UNSUPPORTED_COMMAND', message: 'Command is not available in the combat preview', relatedIds: [command.id] });
  if (!ui && !['exploring', 'boss'].includes(state.flow.phase)) diagnostics.push({ code: 'WRONG_PHASE', message: 'World input is suspended', relatedIds: [command.id] });
  const p = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (command.payload);
  if (command.type === 'SetInput') {
    const move = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (p?.move), aim = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (p?.aim);
    if (!move || !aim || ![move.x, move.y, aim.x, aim.y].every(value => typeof value === 'number' && Number.isFinite(value)) || typeof p?.firing !== 'boolean') diagnostics.push({ code: 'INVALID_INPUT', message: 'Invalid movement/aim sample', relatedIds: [] });
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

/**
 * 按phase与type分派输入/技能/换装/选择/LoRA/交互，不直接持久化。
 * 调用阶段：query；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/attacks.js#planDash
 * @calls domain/attacks.js#planLoadoutChange
 * @calls domain/attacks.js#planSkillCast
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls engine/commands.js#validateGameCommand
 * @calls engine/flow.js#planPause
 * @calls engine/flow.js#planResume
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').CommandResult}
 */
export function planGameCommand(context, command) {
  const report = validateGameCommand(context.state, command);
  if (!report.valid) return { accepted: false, reason: report.diagnostics[0].message, plan: { ...createEmptyPlan(), diagnostics: report.diagnostics } };
  let plan = createEmptyPlan();
  if (command.type === 'Pause') plan = dependency6.planPause(context, 'user');
  else if (command.type === 'Resume') plan = dependency6.planResume(context);
  else if (command.type === 'Dash') plan = dependency1.planDash(context, command);
  else if (command.type === 'SwitchWeapon') plan = dependency1.planLoadoutChange(context, command);
  else if (command.type === 'Skill') plan = dependency1.planSkillCast({ ...context, aim: context.state.input.aim, weapon: context.state.player.loadout.weapons[context.state.player.loadout.activeWeaponIndex] });
  else if (command.type === 'SetInput') {
    const p = /** @type {{move: import('../contracts.d.ts').Vec2; aim: import('../contracts.d.ts').Vec2; firing: boolean}} */ (command.payload);
    const move = normalizeVector(p.move), aim = normalizeVector(p.aim);
    plan = { ...plan, changes: [createStateChange('runtime', 'input', 'setInput', { move, aim: aim.x || aim.y ? aim : context.state.input.aim, firing: p.firing, heldKeys: [], pointerIds: [] })] };
  }
  return { accepted: true, reason: null, plan: { ...plan, changes: [...plan.changes, createStateChange('runtime', command.id, 'ackCommand', { seq: command.seq })] } };
}

/**
 * 按targetTick/seq稳定排序，未来命令保留，重复id拒绝。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {import('../contracts.d.ts').Tick} tick
 * @param {'world' | 'ui'} clockDomain
 * @returns {readonly import('../contracts.d.ts').Command[]}
 */
export function orderPendingCommands(commands, tick, clockDomain) {
  const seen = new Set();
  return commands.filter(command => command.clock === clockDomain && command.targetTick <= tick).sort((a, b) => a.seq - b.seq || a.targetTick - b.targetTick || (a.id < b.id ? -1 : 1)).filter(command => { if (seen.has(command.id)) return false; seen.add(command.id); return true; }).map(command => structuredClone(command));
}
