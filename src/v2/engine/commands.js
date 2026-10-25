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
  const ui = ['Pause', 'Resume', 'SelectPlugin', 'RerollPlugin', 'SkipPlugin', 'StartTraining', 'ConfirmTraining', 'ReleaseTraining', 'Abandon'].includes(command.type);
  if (ui && command.clock !== 'ui' || !ui && command.clock !== 'world') diagnostics.push({ code: 'WRONG_CLOCK', message: 'Command is in the wrong clock domain', relatedIds: [command.id] });
  if (!['SetInput', 'Pause', 'Resume', 'Dash', 'Skill', 'SwitchWeapon', 'EquipPickup', 'SelectPlugin', 'RerollPlugin', 'SkipPlugin', 'StartTraining', 'ConfirmTraining', 'ReleaseTraining', 'Abandon', 'Interact', 'EscapePress', 'ReleaseEscape', 'EscapeHeld'].includes(command.type)) diagnostics.push({ code: 'UNSUPPORTED_COMMAND', message: 'Command is not available in the combat preview', relatedIds: [command.id] });
  if (!ui && !['exploring', 'boss'].includes(state.flow.phase)) diagnostics.push({ code: 'WRONG_PHASE', message: 'World input is suspended', relatedIds: [command.id] });
  if (['SelectPlugin', 'RerollPlugin', 'SkipPlugin'].includes(command.type)) {
    const payload = /** @type {{choiceId?:string;optionId?:string;replaceId?:string}|null} */ (command.payload), choice = state.flow.choice;
    if (state.flow.phase !== 'pluginChoice' || !choice || choice.resolved || payload?.choiceId !== choice.id || command.type === 'SelectPlugin' && !choice.candidates.some(candidate => candidate.id === payload?.optionId) || command.type === 'RerollPlugin' && (state.flow.pluginRerollsUsed ?? 0) >= 1) diagnostics.push({ code: 'INVALID_CHOICE', message: 'Stale or invalid plugin choice', relatedIds: [command.id] });
  }
  if(command.type==='EquipPickup'){const p=/** @type {{pickupId?:string;slotIndex?:number}|null} */(command.payload);if(!p||typeof p.pickupId!=='string'||!Number.isInteger(p.slotIndex)||Number(p.slotIndex)<0||Number(p.slotIndex)>1)diagnostics.push({code:'INVALID_EQUIPMENT_CHOICE',message:'Invalid ground weapon/slot',relatedIds:[]});}
  if(['EscapePress','ReleaseEscape','EscapeHeld'].includes(command.type)){const payload=/** @type {{edge?:string;repeat?:boolean}|null} */(command.payload);if(!payload||payload.edge!==(command.type==='EscapePress'?'press':command.type==='ReleaseEscape'?'release':'held')||payload.repeat===true)diagnostics.push({code:'INVALID_ESCAPE_INPUT',message:'Escape input requires a valid non-repeat edge',relatedIds:[command.id]});}
  if(command.type==='Abandon'&&(state.start.runtimeProfile!=='adventure-slice'||!['exploring','boss','paused','pluginChoice','loraTraining'].includes(state.flow.phase)))diagnostics.push({code:'WRONG_PHASE',message:'Only an active adventure can be abandoned',relatedIds:[command.id]});
  if (command.type === 'Pause' && !['exploring', 'boss', 'paused', 'pluginChoice', 'loraTraining'].includes(state.flow.phase) || command.type === 'Resume' && state.flow.phase !== 'paused') diagnostics.push({ code: 'WRONG_PHASE', message: 'Pause/resume is not valid in this phase', relatedIds: [command.id] });
  if (['StartTraining', 'ConfirmTraining', 'ReleaseTraining'].includes(command.type)) {
    const p = /** @type {{trialId?:string;edge?:string;repeat?:boolean}|null} */ (command.payload), active = state.lora.active;
    const release = command.type === 'ReleaseTraining';
    if (!active || p?.trialId !== active.id || (release ? !['loraTraining', 'paused'].includes(state.flow.phase) || p.edge !== 'release' : state.flow.phase !== 'loraTraining' || p.edge !== 'press' || p.repeat === true || state.lora.inputHeld || command.type === 'StartTraining' && active.phase !== 'ready' || command.type === 'ConfirmTraining' && active.phase !== 'running')) diagnostics.push({ code: 'INVALID_TRAINING_INPUT', message: 'Training requires a fresh press/release for the current trial', relatedIds: [command.id] });
  }
  const p = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (command.payload);
  if (command.type === 'SetInput') {
    const view=/** @type {{width?:number;height?:number}|undefined} */ (p?.viewport);
    if(view&&(![view.width,view.height].every(value=>typeof value==='number'&&Number.isFinite(value))||Number(view.width)<=0||Number(view.height)<=0))diagnostics.push({code:'INVALID_VIEW_BOUNDS',message:'Camera bounds must be finite positive geometry',relatedIds:[]});
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
 * @calls domain/draft.js#planPluginReroll
 * @calls domain/draft.js#planPluginSelection
 * @calls domain/draft.js#planPluginSkip
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/lora.js#planLoraInput
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/status.js#planEscapeInput
 * @calls domain/world/map.js#planWorldInteraction
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
  if(command.type==='Abandon')plan={...plan,changes:[createStateChange('flow','phase','setFlowPhase',{phase:'defeat',resumePhase:null}),createStateChange('runtime','input','setInput',{...context.state.input,move:{x:0,y:0},firing:false,heldKeys:[],pointerIds:[]})]};
  else if(command.type==='Interact')plan=dependency5.planWorldInteraction(context,command);
  else if(['EscapePress','ReleaseEscape','EscapeHeld'].includes(command.type))plan=dependency4.planEscapeInput(context,command);
  else if (['StartTraining', 'ConfirmTraining', 'ReleaseTraining'].includes(command.type)) { const inputPlan = dependency3.planLoraInput(context, command); plan = { ...inputPlan, changes: inputPlan.changes.filter(change => change.operation !== 'registerCommand') }; }
  else if (command.type === 'SelectPlugin') plan = dependency2.planPluginSelection(context, command);
  else if (command.type === 'RerollPlugin') plan = dependency2.planPluginReroll(context, command);
  else if (command.type === 'SkipPlugin') plan = dependency2.planPluginSkip(context, command);
  else if (command.type === 'Pause') plan = dependency6.planPause(context, 'user');
  else if (command.type === 'Resume') plan = dependency6.planResume(context);
  else if (command.type === 'Dash') plan = dependency1.planDash(context, command);
  else if (['SwitchWeapon','EquipPickup'].includes(command.type)) plan = dependency1.planLoadoutChange(context, command);
  else if (command.type === 'Skill') plan = dependency1.planSkillCast({ ...context, aim: context.state.input.aim, weapon: context.state.player.loadout.weapons[context.state.player.loadout.activeWeaponIndex] });
  else if (command.type === 'SetInput') {
  const p = /** @type {{move: import('../contracts.d.ts').Vec2; aim: import('../contracts.d.ts').Vec2; firing: boolean; viewport?: {width:number;height:number}}} */ (command.payload);
    const move = normalizeVector(p.move), aim = normalizeVector(p.aim);
    plan = { ...plan, changes: [createStateChange('runtime', 'input', 'setInput', { move, aim: aim.x || aim.y ? aim : context.state.input.aim, firing: p.firing, ...(p.viewport ? {viewport:p.viewport} : {}), heldKeys: [], pointerIds: [] })] };
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
