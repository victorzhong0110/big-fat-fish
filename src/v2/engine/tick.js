// @ts-check
/**
 * 世界/UI两种固定步的唯一顺序定义。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/ai.js';
import * as dependency2 from '../domain/attacks.js';
import * as dependency3 from '../domain/collision.js';
import * as dependency4 from '../domain/deaths.js';
import * as dependency5 from '../domain/levels.js';
import * as dependency6 from '../domain/lora.js';
import * as dependency7 from '../domain/movement.js';
import * as dependency8 from '../domain/rewards.js';
import * as dependency9 from '../domain/status.js';
import * as dependency10 from '../domain/world/map.js';
import * as dependency11 from '../domain/world/objectives.js';
import * as dependency12 from '../domain/world/pressure.js';
import * as dependency13 from '../domain/world/spawning.js';
import * as dependency14 from './commands.js';
import * as dependency15 from './effectLoop.js';
import * as dependency16 from './flow.js';
import * as dependency17 from './hooks.js';
import * as dependency18 from './reducer.js';

/**
 * 执行架构11的固定世界顺序；仅exploring/boss允许，其他phase不推进世界。
 * 调用阶段：world-tick；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls是阶段依赖，不是忽略参数全部无条件执行；每阶段apply后下阶段读新工作副本。胜负优先于升级，API首领不胜利。
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/commands.js#planGameCommand
 * @calls engine/reducer.js#applySystemPlan
 * @calls domain/status.js#planStatusAdvance
 * @calls engine/hooks.js#planEventHooks
 * @calls domain/world/pressure.js#planPressureSchedule
 * @calls domain/world/pressure.js#planPressureEventAdvance
 * @calls domain/world/spawning.js#planSpawnSchedule
 * @calls domain/ai.js#planEnemyAi
 * @calls domain/ai.js#planBossAi
 * @calls domain/ai.js#planCompanionAi
 * @calls domain/movement.js#planPlayerMovement
 * @calls domain/movement.js#planEntityMotion
 * @calls domain/attacks.js#planWeaponFire
 * @calls domain/movement.js#planPickupMotion
 * @calls domain/collision.js#detectCollisions
 * @calls domain/attacks.js#planCollisionEffects
 * @calls engine/effectLoop.js#drainEffectQueue
 * @calls domain/rewards.js#planDeathRewards
 * @calls domain/world/map.js#planMapExploration
 * @calls domain/world/objectives.js#planObjectiveAdvance
 * @calls domain/world/objectives.js#planApiProgression
 * @calls domain/levels.js#planLevelProgression
 * @calls domain/deaths.js#resolveTerminalOutcome
 * @calls engine/flow.js#planProgressionPanels
 * @calls engine/reducer.js#commitWorkingState
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').TickResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function advanceWorldTick(state, commands, catalog) {
  throw new Error('TODO V2: engine/tick.js#advanceWorldTick');
}

/**
 * 处理LoRA固定指针和菜单命令，世界tick及所有战斗倒计时保持。
 * 调用阶段：ui-tick；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/commands.js#planGameCommand
 * @calls domain/lora.js#planLoraUiStep
 * @calls domain/lora.js#planLoraOutcome
 * @calls engine/flow.js#planProgressionPanels
 * @calls engine/reducer.js#applySystemPlan
 * @calls engine/reducer.js#commitWorkingState
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').TickResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function advanceUiTick(state, commands, catalog) {
  throw new Error('TODO V2: engine/tick.js#advanceUiTick');
}
